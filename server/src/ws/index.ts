import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
let io: Server;

interface SocketUser {
  id: number;
  type: "guest" | "driver" | "frontdesk" | "admin" | "super-admin";
  hotelId?: number;
}

export const initWebSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
      ],
      methods: ["GET", "POST"],
    },
  });

  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
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

      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log("A user connected:", socket.id);
    const user: SocketUser = socket.data.user;

    if (user) {
      console.log(`User ${user.id} (${user.type}) connected.`);
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
    }

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
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
  getIo().to(`${userType}:${userId}`).emit(event, payload);
};

export const sendToRoleInHotel = (
  hotelId: number,
  role: string,
  event: string,
  payload: any
) => {
  const room = `hotel:${hotelId}:${role}`;
  console.log(`Sending event '${event}' to room '${room}'`);
  getIo().to(room).emit(event, payload);
};
