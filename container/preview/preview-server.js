/*global module, unescape*/
var log = require("logging").from(__filename);
var Q = require("q");
var FS = require("q-io/fs");
var URL = require("url");
var HttpApps = require("q-io/http-apps/fs");
var StatusApps = require("q-io/http-apps/status");
// FIXME docker
var WebSocket = require("faye-websocket");
var preview = require("../services/preview-service");
var hasPreviewAccess = require("./check-preview-access").hasPreviewAccess;
var querystring = require("querystring");

var CLIENT_FILES = "{$PREVIEW}";

var CLIENT_ROOT = __dirname + "/client/";

var clientFs = FS.reroot(CLIENT_ROOT);

module.exports.Preview = Preview;
module.exports.servePreviewAccessForm = servePreviewAccessForm;
module.exports.processAccessRequest = processAccessRequest;
// for testing
module.exports.injectPreviewScripts = injectPreviewScripts;
module.exports.servePreviewClientFile = servePreviewClientFile;

/**
 * This file implements the functionality needed to serve the preview pages by
 * providing two "services":
 * 1) To be injected into the project-chain so that it can intercept the serving
 * of index.html file and modify it in order to include the preview specific
 * script. And to intercept requests to the CLIENT_FILES path to serve the
 * preview specific resources such as scripts.
 * 2) To provide the webservice necessary to instrumentate the preview clients.
 * This is how firefly asks all preview clients to refresh or give other
 * commands. This webservice is also served through the project-chain connection.
 */
function Preview(config) {
    var use = function(next) {
        return function(request, response) {
            var path = unescape(request.pathInfo);

            if (path.indexOf("/" + CLIENT_FILES + "/") === 0) {
                return servePreviewClientFile(request, response);
            }

            return Q.when(next(request, response), function(response) {
                if (response.body && path === "/index.html") {
                    return injectPreviewScripts(request, response);
                } else {
                    return response;
                }
            });
        };
    };

    use.wsServer = startWsServer(config);
    return use;
}

function injectScriptInHtml(src, html) {
    var index = html.toLowerCase().indexOf("</head>");

    if (index !== -1) {
        html = html.substring(0, index) +
            '<script type="text/javascript" src="' + src + '"></script>\n' +
            html.substring(index);
    }

    return html;
}

function injectPreviewScripts(request, response) {
    return response.body.then(function(body) {
        return body.read();
    })
    .then(function(body) {
        var html = body.toString();
        var liveEditSrc = "/" + CLIENT_FILES + "/live-edit.js";
        var previewSrc = "/" + CLIENT_FILES + "/preview.js";

        html = injectScriptInHtml(liveEditSrc, html);
        html = injectScriptInHtml(previewSrc, html);
        response.body = [html];
        response.headers['content-length'] = html.length;
        return response;
    });
}

function servePreviewClientFile(request, response) {
    var path = unescape(request.pathInfo);

    return clientFs.then(function(fs) {
        path = path.slice(("/" + CLIENT_FILES + "/").length);

        if (path === "preview.js" || path === "live-edit.js") {
            return HttpApps.file(request, path, null, fs);
        }

        return StatusApps.notFound(request);
    });
}

function servePreviewAccessForm(request) {
    return clientFs.then(function(fs) {
        return HttpApps.file(request, "access.html", null, fs);
    });
}

function processAccessRequest(request) {
    // Get code from the body data
    return request.body.read()
    .then(function(body) {
        if (body.length > 0) {
            var query = querystring.parse(body.toString());

            maybeGrantAccessToPreview(
                query.code, request.headers.host, request.session);
        }

        // 302 - Temporary redirect using GET
        return {
            status: 302,
            headers: {
                Location: "/index.html"
            }
        };
    });
}

function maybeGrantAccessToPreview(code, previewHost, session) {
    var accessCode = preview.getPreviewAccessCodeFromUrl(previewHost);

    if (code && accessCode && code === accessCode) {
        if (session.previewAccess) {
            if (session.previewAccess.indexOf(previewHost) === -1) {
                session.previewAccess.push(previewHost);
            }
        } else {
            session.previewAccess = [previewHost];
        }
        log("access granted ", previewHost);
        return true;
    } else {
        log("access denied");
        return false;
    }
}

function startWsServer(config) {
    // this server will get upgraded by container-chain
    var websocketConnections = 0;

    return function (request, socket, body) {
        if (!WebSocket.isWebSocket(request)) {
            return;
        }

        var ws = new WebSocket(request, socket, body, ["firefly-preview"]);

        var pathname = URL.parse(request.url).pathname;
        var remoteAddress = socket.remoteAddress;

        // = config.githubUser + "/" + config.owner + "/" + config.repo;
        // FIXME docker move this up out into the project chain/server
        return hasPreviewAccess(request.headers.host, config).then(function (hasPreviewAccess) {
            if (hasPreviewAccess) {
                log("websocket connection", remoteAddress, pathname, "open connections:", ++websocketConnections);

                preview.registerConnection(ws);

                ws.on("close", function () {
                    log("websocket connection closed: ", --websocketConnections);
                    preview.unregisterConnection(ws);
                });
            } else {
                ws.close();
            }
        });
    };
}
