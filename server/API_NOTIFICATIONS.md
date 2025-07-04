# Driver Notification API Documentation

## Overview
The notification system provides real-time updates to drivers about their trips, passengers, schedules, and system events.

## Base URL
```
POST /api/driver
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <driver_token>
```

## Endpoints

### 1. Get Notifications
Retrieve all notifications for the authenticated driver.

**Endpoint:** `GET /driver/notifications`

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "New Trip Assigned",
      "message": "Hello Driver, you have been assigned to Trip #TRP-001. Please check your dashboard for details.",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "driverId": 1,
      "guestId": null,
      "frontDeskId": null,
      "adminId": null
    }
  ]
}
```

### 2. Mark Notification as Read
Mark a specific notification as read.

**Endpoint:** `PUT /driver/notifications/:notificationId/read`

**Parameters:**
- `notificationId` (path): The ID of the notification to mark as read

**Response:**
```json
{
  "message": "Notification marked as read"
}
```

### 3. Mark All Notifications as Read
Mark all unread notifications for the driver as read.

**Endpoint:** `PUT /driver/notifications/mark-all-read`

**Response:**
```json
{
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```



## Notification Types

The system automatically categorizes notifications based on their content:

### Success Notifications
- Contains keywords: "success", "confirmed", "successfully"
- Icon: Green checkmark
- Examples: Payment received, passenger checked in

### Warning Notifications
- Contains keywords: "warning", "alert", "traffic", "delay"
- Icon: Yellow triangle
- Examples: Traffic alerts, schedule changes

### Info Notifications
- Default category for all other notifications
- Icon: Blue information circle
- Examples: New trip assignments, system updates

## Notification Categories

### Trip Related
- New trip assignments
- Trip started/completed
- Route updates

### Passenger Related
- New passengers added
- Passenger check-ins
- Payment confirmations

### Schedule Related
- Schedule updates
- Schedule cancellations

### System Related
- System maintenance
- Weather alerts
- Traffic alerts

## Real-time Updates

Notifications are also sent via WebSocket for real-time updates:

**Event:** `welcome`
**Payload:**
```json
{
  "title": "Notification Title",
  "message": "Notification message",
  "notificationId": 1
}
```

## Error Responses

### 404 - Notification Not Found
```json
{
  "message": "Notification not found"
}
```

### 500 - Internal Server Error
```json
{
  "message": "Internal server error"
}
```

## Usage Examples

### Frontend Integration

```typescript
// Fetch notifications
const response = await api.get("/driver/notifications");
const notifications = response.notifications;

// Mark as read
await api.put(`/driver/notifications/${notificationId}/read`);

// Mark all as read
await api.put("/driver/notifications/mark-all-read");
```

### Creating Notifications (Server-side)

```typescript
import { createDriverNotification, DriverNotificationTypes } from "../utils/notificationUtils";

// Create a trip assignment notification
await createDriverNotification(
  driverId,
  "New Trip Assigned",
  "You have been assigned to Trip #TRP-001"
);

// Or use predefined types
const notification = DriverNotificationTypes.TRIP_ASSIGNED("Driver Name", "TRP-001");
await createDriverNotification(driverId, notification.title, notification.message);
```

## Database Schema

```sql
CREATE TABLE Notification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW() ON UPDATE NOW(),
  driverId INT,
  guestId INT,
  frontDeskId INT,
  adminId INT,
  FOREIGN KEY (driverId) REFERENCES Driver(id) ON DELETE CASCADE,
  FOREIGN KEY (guestId) REFERENCES Guest(id) ON DELETE CASCADE,
  FOREIGN KEY (frontDeskId) REFERENCES FrontDesk(id) ON DELETE CASCADE,
  FOREIGN KEY (adminId) REFERENCES Admin(id) ON DELETE CASCADE
);
```

## Testing

To test the notification system:

1. Navigate to `/dashboard/notifications` in the driver app
2. Test marking individual notifications as read
3. Test marking all notifications as read
4. Verify the notification count updates in the topbar

## Notes

- Notifications are ordered by creation date (newest first)
- Only the last 50 notifications are returned to prevent performance issues
- Unread notifications are highlighted with a blue background
- The notification count in the topbar updates automatically
- Real-time notifications are sent via WebSocket for immediate updates 