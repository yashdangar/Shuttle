import { Request, Response } from "express";
import prisma from "../db/prisma";
import axios from "axios";
import { PaymentMethod, BookingType } from "@prisma/client";

const getGuest = (req: Request, res: Response) => {
  res.json({ message: "Guest route" });
};

const getAddressFromCoordinates = async (lat: number, lon: number) => {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    return response.data.display_name;
  } catch (error) {
    console.error("Error fetching address:", error);
    return null;
  }
};

const getHotels = async (req: Request, res: Response) => {
  try {
    const hotels = await prisma.hotel.findMany();

    // Convert coordinates to addresses for each hotel
    const hotelsWithAddresses = await Promise.all(
      hotels.map(async (hotel) => {
        const address =
          hotel.latitude && hotel.longitude
            ? await getAddressFromCoordinates(hotel.latitude, hotel.longitude)
            : null;
        return {
          ...hotel,
          address: address || "Address not available",
        };
      })
    );

    res.json({ hotels: hotelsWithAddresses });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
};

const setHotel = async (req: Request, res: Response) => {
  const { hotelId } = req.body;
  const userId = (req as any).user.userId;
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });
  if (!hotel) {
    return res.status(404).json({ error: "Hotel not found" });
  }
  const user = await prisma.guest.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const guest = await prisma.guest.update({
    where: { id: userId },
    data: { hotelId },
  });
  res.json({ guest });
};

const getHotel = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const hotel = await prisma.guest.findUnique({
    where: { id: userId },
    include: {
      hotel: true,
    },
  });
  res.json({ hotel });
};

const getLocations = async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany();
    res.json({ locations });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

const createTrip = async (req: Request, res: Response) => {
  const {
    numberOfPersons,
    numberOfBags,
    preferredTime,
    paymentMethod,
    bookingType,
    pickupLocationId,
    dropoffLocationId,
  } = req.body;
  const userId = (req as any).user.userId;

  try {
    const trip = await prisma.booking.create({
      data: {
        numberOfPersons,
        numberOfBags,
        preferredTime: new Date(preferredTime),
        paymentMethod: paymentMethod as PaymentMethod,
        bookingType: bookingType as BookingType,
        pickupLocationId: pickupLocationId ? parseInt(pickupLocationId) : null,
        dropoffLocationId: dropoffLocationId ? parseInt(dropoffLocationId) : null,
        guestId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    res.json({ trip });
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: "Failed to create trip" });
  }
};

const getTrips = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const trips = await prisma.booking.findMany({
    where: { guestId: userId },
  });
  res.json({ trips });
};

const getTrip = async (req: Request, res: Response) => {
  const { id } = req.params;
  const trip = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
  });
  res.json({ trip });
};

export default { getGuest, getHotels, setHotel, getHotel, getLocations, createTrip, getTrips, getTrip };
