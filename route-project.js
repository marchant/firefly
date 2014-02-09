/**
 * The purpose is to determine the project pod a user will connect to and to route the request appropriately
 * Created by pierre on 2/12/2014.
 */
var Env = require("./environment");
var Q = require("q");

exports = module.exports = RouteProject;

function RouteProject() {
    // Empty
}

RouteProject.addRouteProjectCookie = function (request, response) {
    var setCookies = response.headers["set-cookie"];
    if (!setCookies) {
        setCookies = [];
    } else if (!Array.isArray(setCookies)) {
        setCookies = [setCookies];
    }
    var cookie = "project=P" + RouteProject.podForUsername(request.session.username) + "; Path=/;";
    setCookies.push(cookie);
    response.headers["set-cookie"] = setCookies;
    return response;
}

RouteProject.podForUsername = function (username) {
    return RouteProject.checksum(username) % Env.projectServers + 1;
}

RouteProject.checksum = function (s) {
    var hash = 0,
        strlen = (s ? s.length : 0),
        i,
        c;
    if (strlen === 0) {
        return hash;
    }
    for (i = 0; i < strlen; i++) {
        c = s.charCodeAt(i);
        hash = ((hash << 5) - hash ) + c;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};