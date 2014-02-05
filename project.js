var Env = require("./environment");
var log = require("logging").from(__filename);
var FS = require("q-io/fs");

var projectChainFactory = require("./project/project-chain");

var GithubSessionStore = require("./github-session-store");
var Session = require("./session");
var CheckSession = require("./check-session");

var SESSION_SECRET = "bdeffd49696a8b84e4456cb0740b3cea7b4f85ce";

var commandOptions = {
    "client": {
        alias: "c",
        describe: "A directory containing filament",
        default: "../filament"
    },
    "directory": {
        alias: "d",
        describe: "The directory to clone and serve projects from",
        default: "../clone"
    },
    "port": {
        alias: "p",
        describe: "The port to run the app server on",
        default: Env.project.port || Env.port
    },
    "help": {
        describe: "Show this help",
    }
};

module.exports = main;
function main(options) {
    var sessions = Session("session", SESSION_SECRET, null, new GithubSessionStore());
    var fs = options.fs || FS;

    Env.configure(fs, fs.absolute(options.directory));

    var projectChain = projectChainFactory({
        fs: fs,
        client: options.client,
        clientServices: options.clientServices,
        sessions: sessions,
        checkSession: CheckSession,
        setupProjectWorkspace: require("./project/setup-project-workspace"),
        directory: fs.absolute(options.directory),
        minitPath: fs.join(__dirname, "node_modules", "minit", "minit")
    });
    return projectChain.listen(options.port)
    .then(function (server) {
        log("Listening on", Env.app.href);

        server.node.on("upgrade", projectChain.upgrade);

        // for naught
        if (process.send) {
            process.on("message", function(message) {
                if (message === "shutdown") {
                    log("shutdown message from Naught");
                    // TODO gracefully shutdown the websocket connections
                    server.stop()
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
    var optimist = require("optimist");
    var argv = optimist
        .usage("Usage: $0 [--client=<directory>] [--directory=<directory>] [--port=<port>]")
        .options(commandOptions).argv;

    if (argv.help) {
        optimist.showHelp();
        return;
    }

    // TODO this should be moved to main, and generated by listing the client
    // backend_plugins directory
    argv.clientServices = {
        "filament-services": "backend_plugins/filament-backend"
    };

    main(argv).done();
}
