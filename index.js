var Q = require("q");
var Env = require("./environment");
var log = require("logging").from(__filename);
var FS = require("q-io/fs");

var multiplex = require("./multiplex");
var appChain = require("./app-chain");
var projectChain = require("./project-chain");

var GithubSessionStore = require("./github-session-store");
var Session = require("./session");
var CheckSession = require("./check-session");
var SetupProjectWorkspace = require("./setup-project-workspace");

var SESSION_SECRET = "bdeffd49696a8b84e4456cb0740b3cea7b4f85ce";

var commandOptions = {
    "client": {
        alias: "c",
        describe: "A directory containing filament"
    },
    "app-port": {
        alias: "p",
        describe: "The port to run the app server on",
        default: Env.app.port
    },
    "project-port": {
        alias: "P",
        describe: "The port to run the project server on",
        default: Env.project.port
    },
    "project-dir": {
        alias: "d",
        describe: "The directory to clone and serve projects from",
        default: "../clone"
    }
};

module.exports = main;
function main(options) {
    var sessions = Session("session", SESSION_SECRET, null, new GithubSessionStore());

    var fs = options.fs || FS;
    return multiplex(
        options,
        appChain,
        {
            fs: fs,
            client: options.client,
            sessions: sessions,
            clientServices: options.clientServices,
            setupProjectWorkspace: SetupProjectWorkspace,
            directory: fs.join(process.cwd(), options["project-dir"]),
            minitPath: fs.join(process.cwd(), "node_modules", "minit", "minit")
        },
        projectChain,
        {
            fs: fs,
            sessions: sessions,
            checkSession: CheckSession
        })
        .spread(function (app, project) {
            log("Listening on", Env.app.href);

            // for naught
            if (process.send) {
                process.on("message", function(message) {
                    if (message === "shutdown") {
                        log("shutdown message from Naught");
                        // TODO gracefully shutdown the websocket connections
                        Q.all([app.server.stop(), project.server.stop()])
                        .catch(function (error) {
                            global.console.error("Error shutting down", error.stack);
                            throw error;
                        })
                        .finally(function () {
                            log("goodbye.");
                            process.exit(0);
                        });
                    }
                });

                process.send("online");
            }
        });
}

if (require.main === module) {
    var argv = require("optimist")
        .usage("Usage: $0 --client=<directory> [--port=<port>]")
        .demand(["client"])
        .options(commandOptions).argv;

    // TODO this should be moved to main, and generated by listing the client
    // backend_plugins directory
    argv.clientServices = {
        "filament-services": "backend_plugins/filament-backend"
    };

    main(argv).done();
}
