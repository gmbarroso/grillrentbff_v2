# GrillRent BFF

GrillRent BFF is a Backend-for-Frontend (BFF) built with [NestJS](https://nestjs.com/) to manage interactions between the frontend and the main GrillRent API. This project acts as an intermediary layer for authentication, authorization, and API calls.

## Features

- **User Management**:
  - Registration, login, profile, and user management.
- **Resources**:
  - Management of resources like grills, courts, etc.
- **Notices**:
  - Creation, update, and deletion of notices.
- **Bookings**:
  - Creation, retrieval, deletion, and availability checks for bookings.

## Technologies Used

- **Node.js** with **NestJS**: Framework for building scalable APIs.
- **TypeORM**: ORM for database management.
- **JWT**: Token-based authentication.
- **Axios**: For external HTTP calls.
- **PostgreSQL**: Relational database.

## Project Structure

```
src/
├── api/
│   ├── controllers/       # Controllers to manage routes
│   ├── services/          # Services for business logic
│   ├── entities/          # Database entities
│   ├── dto/               # Data Transfer Objects (DTOs)
│   └── api.module.ts      # Main API module
├── shared/
│   ├── auth/              # Authentication and authorization
│   ├── http/              # HTTP service for external calls
│   └── pipes/             # Validation pipes
└── main.ts                # Main application entry point
```

## Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:gmbarroso/grillrentbff_v2.git
   cd grillrentbff_v2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the project root with the following variables:
   ```
   API_URL=http://localhost:3001
   JWT_SECRET=your_jwt_secret
   DATABASE_URL=postgres://user:password@localhost:5432/grillrent
   ```

4. Run database migrations:
   ```bash
   npm run typeorm migration:run
   ```

5. Start the server:
   ```bash
   npm run start:dev
   ```

## Main Endpoints

### Users
- **POST** `/users/register`: Register a new user.
- **POST** `/users/login`: Log in.
- **GET** `/users/profile`: Get user profile.

### Resources
- **POST** `/resources`: Create a resource.
- **GET** `/resources`: List all resources.
- **PUT** `/resources/:id`: Update a resource.
- **DELETE** `/resources/:id`: Delete a resource.

### Notices
- **POST** `/notices`: Create a notice.
- **GET** `/notices`: List all notices.
- **PUT** `/notices/:id`: Update a notice.
- **DELETE** `/notices/:id`: Delete a notice.

### Bookings
- **POST** `/bookings`: Create a booking.
- **GET** `/bookings/user/:userId`: List bookings for a user.
- **GET** `/bookings`: List all bookings.
- **DELETE** `/bookings/:id`: Delete a booking.
- **GET** `/bookings/availability/:resourceId`: Check availability.
- **GET** `/bookings/reserved-times`: Get reserved times.

## Testing

Run tests with the following command:
```bash
npm run test
```

## Contribution

1. Fork the repository.
2. Create a branch for your feature:
   ```bash
   git checkout -b my-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "My new feature"
   ```
4. Push to the remote repository:
   ```bash
   git push origin my-feature
   ```
5. Open a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

---

**Developed by Guilherme Barroso**