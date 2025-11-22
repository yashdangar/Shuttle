import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/uploadProfilePicture",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const blob = await request.blob();
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return new Response("userId is required", {
        status: 400,
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
          Vary: "origin",
        }),
      });
    }

    const storageId = await ctx.storage.store(blob);
    const fileName = url.searchParams.get("fileName") || "profile-picture";

    await ctx.runMutation(api.files.uploadProfilePicture, {
      storageId,
      userId: userId as any,
      fileName,
    });

    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
        Vary: "origin",
      }),
    });
  }),
});

http.route({
  path: "/uploadProfilePicture",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/uploadHotelImage",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const blob = await request.blob();
    const url = new URL(request.url);
    const hotelId = url.searchParams.get("hotelId");

    if (!hotelId) {
      return new Response("hotelId is required", {
        status: 400,
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
          Vary: "origin",
        }),
      });
    }

    const storageId = await ctx.storage.store(blob);
    const fileName = url.searchParams.get("fileName") || "hotel-image";

    const userId = url.searchParams.get("userId");
    if (!userId) {
      return new Response("userId is required", {
        status: 400,
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
          Vary: "origin",
        }),
      });
    }

    await ctx.runMutation(api.files.uploadHotelImage, {
      storageId,
      hotelId: hotelId as any,
      userId: userId as any,
      fileName,
    });

    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
        Vary: "origin",
      }),
    });
  }),
});

http.route({
  path: "/uploadHotelImage",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

export default http;
