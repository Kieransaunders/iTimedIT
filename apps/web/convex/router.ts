import { httpRouter } from "convex/server";
import { invitationInfo } from "./invitations";

const http = httpRouter();

http.route({
  path: "/invite",
  method: "GET",
  handler: invitationInfo,
});

http.route({
  pathPrefix: "/invite/",
  method: "GET",
  handler: invitationInfo,
});

export default http;
