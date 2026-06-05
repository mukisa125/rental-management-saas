# Rental Management SaaS

A complete modern Rental Management SaaS web application built with React 19, Node.js, Express, and MongoDB.

## Features

- **Authentication**: User registration, login, JWT authentication, protected routes
- **Dashboard**: Overview with statistics, charts, and recent activities
- **Properties Management**: Add, edit, delete, and view properties
- **Units Management**: Manage rental units with status tracking
- **Tenant Management**: Complete tenant profiles with lease information
- **Rent Payments**: Track payments, record transactions, view history
- **Maintenance Requests**: Create and track maintenance requests
- **Reports**: Analytics and reporting with visual charts
- **Settings**: User profile, company info, notifications, and security settings

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS
- React Router DOM
- Axios
- Lucide React Icons
- Recharts (for charts)

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- CORS

## Project Structure

```
rental-management-saas/
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── context/         # React context
│   │   └── assets/          # Static assets
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/              # Database configuration
│   ├── models/              # Mongoose models
│   ├── routes/              # Express routes
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   ├── server.js            # Server entry point
│   ├── seed.js              # Database seeder
│   ├── .env                 # Environment variables
│   └── package.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rental-management
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
```

4. Seed the database with sample data:
```bash
npm run seed
```

5. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

### Default User
After seeding the database, you can login with:
- Email: `mark@example.com`
- Password: `password123`

### Main Features

1. **Dashboard**: View overview statistics, rent collection chart, recent activities, and quick stats
2. **Properties**: Manage your properties with full CRUD operations
3. **Units**: Add and manage rental units within properties
4. **Tenants**: Manage tenant information and lease details
5. **Payments**: Record and track rent payments
6. **Maintenance**: Create and track maintenance requests
7. **Reports**: View analytics and reports with visual charts
8. **Settings**: Update profile, change password, manage notifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Properties
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Units
- `GET /api/units` - Get all units
- `GET /api/units/:id` - Get single unit
- `POST /api/units` - Create unit
- `PUT /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Delete unit

### Tenants
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get single tenant
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/stats` - Get payment statistics
- `GET /api/payments/:id` - Get single payment
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment
- `DELETE /api/payments/:id` - Delete payment

### Maintenance
- `GET /api/maintenance` - Get all maintenance requests
- `GET /api/maintenance/:id` - Get single request
- `POST /api/maintenance` - Create maintenance request
- `PUT /api/maintenance/:id` - Update maintenance request
- `DELETE /api/maintenance/:id` - Delete maintenance request

## Theme Colors

- Primary: Emerald Green (#16A34A)
- Secondary: Dark Green (#14532D)
- Background: Light Gray (#F8FAFC)

## Deployment

### Backend Deployment (e.g., Render, Heroku, Railway)

1. Set up a MongoDB database (MongoDB Atlas recommended)
2. Update environment variables with production values
3. Deploy the backend using your preferred platform
4. Ensure `JWT_SECRET` is set to a strong random string

### Frontend Deployment (e.g., Vercel, Netlify)

1. Update `VITE_API_URL` to point to your production backend
2. Build the frontend: `npm run build`
3. Deploy the `dist` folder to your preferred platform

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Linting
```bash
# Frontend
cd frontend
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, please open an issue in the repository or contact the development team.
