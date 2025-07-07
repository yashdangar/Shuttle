import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { CORS_ORIGINS } from "../config/env";
import { WsEvents } from "./events";
let io: Server;

interface SocketUser {
  id: number;
  type: "guest" | "driver" | "frontdesk" | "admin" | "super-admin";
  hotelId?: number;
}

export const initWebSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: CORS_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"], // Only allow websocket transport
    allowEIO3: true, // Allow Engine.IO v3 clients
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
  });

  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log("WebSocket authentication failed: Token not provided");
      return next(new Error("Authentication error: Token not provided"));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as jwt.JwtPayload;

      socket.data.user = {
        id: decoded.userId,
        hotelId: decoded.hotelId,
        type: decoded.role,
      };

      console.log(
        `WebSocket authentication successful for user ${decoded.userId} (${decoded.role})`
      );
      next();
    } catch (err) {
      console.log("WebSocket authentication failed: Invalid token", err);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);
    const user: SocketUser = socket.data.user;

    if (user) {
      console.log(`User ${user.id} (${user.type}) connected via WebSocket.`);
      // Join a room for the hotel if hotelId is present
      if (user.hotelId) {
        const hotelRoom = `hotel:${user.hotelId}`;
        socket.join(hotelRoom);
        console.log(`User ${user.id} joined hotel room: ${hotelRoom}`);

        const hotelRoleRoom = `hotel:${user.hotelId}:${user.type}`;
        socket.join(hotelRoleRoom);
        console.log(`User ${user.id} joined hotel-role room: ${hotelRoleRoom}`);
      }

      // Join a personal room based on user type and id
      const userRoom = `${user.type}:${user.id}`;
      socket.join(userRoom);
      console.log(`User ${user.id} joined personal room: ${userRoom}`);

      // Send a welcome message to confirm connection
      socket.emit("welcome", {
        message: `Welcome! WebSocket connection established.`,
        userId: user.id,
        userType: user.type,
      });
    }

    // Chat event handlers
    socket.on(
      WsEvents.JOIN_CHAT,
      (data: { chatId: string; hotelId: number }) => {
        const chatRoom = `chat:${data.chatId}`;
        socket.join(chatRoom);
        console.log(`User ${user?.id} joined chat room: ${chatRoom}`);

        // Notify other participants in the chat
        socket.to(chatRoom).emit(WsEvents.JOIN_CHAT, {
          chatId: data.chatId,
          hotelId: data.hotelId,
          userId: user?.id,
          userType: user?.type,
        });
      }
    );

    socket.on(
      WsEvents.LEAVE_CHAT,
      (data: { chatId: string; hotelId: number }) => {
        const chatRoom = `chat:${data.chatId}`;
        socket.leave(chatRoom);
        console.log(`User ${user?.id} left chat room: ${chatRoom}`);

        // Notify other participants in the chat
        socket.to(chatRoom).emit(WsEvents.LEAVE_CHAT, {
          chatId: data.chatId,
          hotelId: data.hotelId,
          userId: user?.id,
          userType: user?.type,
        });
      }
    );

    socket.on(
      WsEvents.TYPING_START,
      (data: { chatId: string; senderType: string; senderId: number }) => {
        const chatRoom = `chat:${data.chatId}`;
        socket.to(chatRoom).emit(WsEvents.TYPING_START, {
          chatId: data.chatId,
          senderType: data.senderType,
          senderId: data.senderId,
        });
      }
    );

    socket.on(
      WsEvents.TYPING_STOP,
      (data: { chatId: string; senderType: string; senderId: number }) => {
        const chatRoom = `chat:${data.chatId}`;
        socket.to(chatRoom).emit(WsEvents.TYPING_STOP, {
          chatId: data.chatId,
          senderType: data.senderType,
          senderId: data.senderId,
        });
      }
    );

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    });

    socket.on("error", (error) => {
      console.error("WebSocket error for socket:", socket.id, error);
    });
  });

  // Log server events
  io.engine.on("connection_error", (err) => {
    console.error(
      "WebSocket connection error:",
      err.req?.url,
      err.code,
      err.message
    );
  });
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const sendToUser = (
  userId: number,
  userType: string,
  event: string,
  payload: any
) => {
  try {
    const room = `${userType}:${userId}`;
    console.log(`Sending event '${event}' to user room '${room}'`);
    getIo().to(room).emit(event, payload);
  } catch (error) {
    console.error(
      `Error sending event '${event}' to user ${userType}:${userId}:`,
      error
    );
  }
};

export const sendToRoleInHotel = (
  hotelId: number,
  role: string,
  event: string,
  payload: any
) => {
  try {
    const room = `hotel:${hotelId}:${role}`;
    console.log(`Sending event '${event}' to room '${room}'`);
    getIo().to(room).emit(event, payload);
  } catch (error) {
    console.error(
      `Error sending event '${event}' to room 'hotel:${hotelId}:${role}':`,
      error
    );
  }
};

export const sendToChat = (chatId: string, event: string, payload: any) => {
  try {
    const room = `chat:${chatId}`;
    console.log(`Sending event '${event}' to chat room '${room}'`);
    getIo().to(room).emit(event, payload);
  } catch (error) {
    console.error(
      `Error sending event '${event}' to chat room 'chat:${chatId}':`,
      error
    );
  }
};
