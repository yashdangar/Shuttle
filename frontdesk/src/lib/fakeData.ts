// Fake user for login
export const fakeUser = {
    email: "dev1@gmail.com",
    password: "sasasasa",
    name: "Frontdesk Staff"
};

// Reservation type
type Reservation = {
    id: string;
    confirmationNumber?: string;
    firstName: string;
    lastName: string;
    bookedByThirdParty: boolean;
    isResident: boolean;
    pickupLocation: string;
    destination: string;
    numPersons: number;
    numBags: number;
    preferredTime: string;
    paymentMethod: "app" | "cash" | "deposit";
    paymentStatus: "paid" | "unpaid";
    qrCode?: string;
    eta?: string;
    status: "reserved" | "confirmed" | "cancelled" | "completed";
    addedBy: string;
    notes?: string;
};

// Fake reservations
type Reservations = Reservation[];

export const fakeReservations: Reservations = [
    {
        id: "1",
        confirmationNumber: "ABC123",
        firstName: "John",
        lastName: "Doe",
        bookedByThirdParty: false,
        isResident: false,
        pickupLocation: "Hotel Lobby",
        destination: "Airport",
        numPersons: 2,
        numBags: 3,
        preferredTime: "2024-06-10T10:00",
        paymentMethod: "app",
        paymentStatus: "paid",
        qrCode: "qr-1",
        eta: "10:30",
        status: "reserved",
        addedBy: "Frontdesk Staff",
        notes: "Needs child seat"
    },
    {
        id: "2",
        firstName: "Jane",
        lastName: "Smith",
        bookedByThirdParty: true,
        isResident: false,
        pickupLocation: "Partner Hotel",
        destination: "Downtown",
        numPersons: 1,
        numBags: 1,
        preferredTime: "2024-06-10T11:00",
        paymentMethod: "cash",
        paymentStatus: "unpaid",
        qrCode: "qr-2",
        eta: "11:30",
        status: "confirmed",
        addedBy: "Frontdesk Staff"
    }
];

// You can add more fake data as needed for drivers, notifications, etc. 