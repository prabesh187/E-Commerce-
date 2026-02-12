# Made in Nepal E-Commerce Platform 🇳🇵

A complete e-commerce platform exclusively for products manufactured in Nepal, including food, handicrafts, clothing, and electronics.

## 🚀 Features

- **User Authentication**: Secure login/register for Buyers, Sellers, and Admins
- **Product Catalog**: Browse 12+ authentic Nepali products
- **Shopping Cart**: Add items, update quantities, checkout
- **Payment Integration**: eSewa, Khalti, and Cash on Delivery
- **Order Management**: Track orders from placement to delivery
- **Seller Dashboard**: Manage products, inventory, and orders
- **Admin Dashboard**: Verify sellers, approve products, manage platform
- **Product Reviews**: Rate and review purchased products
- **Search & Filter**: Find products by category, price, rating
- **Wishlist**: Save products for later
- **Multi-language**: English and Nepali support
- **Responsive Design**: Works on mobile, tablet, and desktop

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **MongoDB** with Mongoose
- **JWT** authentication
- **bcrypt** for password hashing
- **Multer** for file uploads

### Frontend
- **React** with **TypeScript**
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **i18next** for internationalization
- **Axios** for API calls

### Security
- Input sanitization (XSS protection)
- CSRF protection
- SQL injection prevention
- Rate limiting
- Password hashing

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/made-in-nepal
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Seed the database:
```bash
npm run seed
```

Start backend server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file in frontend directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=Made in Nepal
```

Start frontend server:
```bash
npm run dev
```

## 🎯 Usage

1. **Open browser**: http://localhost:5173
2. **Login** with test accounts:
   - **Buyer**: buyer@madeinnepal.com / Buyer@123
   - **Seller**: seller@madeinnepal.com / Seller@123
   - **Admin**: admin@madeinnepal.com / Admin@123
3. **Browse products** by clicking categories
4. **Add to cart** and checkout
5. **Manage orders** in your dashboard

## 📱 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Buyer | buyer@madeinnepal.com | Buyer@123 |
| Seller | seller@madeinnepal.com | Seller@123 |
| Admin | admin@madeinnepal.com | Admin@123 |

## 🗂️ Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── locales/        # Translations
│   │   └── App.tsx         # Root component
│   └── package.json
│
└── README.md
```

## 🔧 Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🌟 Key Features Explained

### For Buyers
- Browse products by category
- Search with autocomplete
- Add items to cart and wishlist
- Secure checkout with multiple payment options
- Track order status
- Write product reviews

### For Sellers
- Dashboard with sales analytics
- Add and manage products
- Update inventory
- View and process orders
- Track product performance

### For Admins
- Verify seller accounts
- Approve products
- Manage platform content
- View platform analytics
- Manage promotional banners

## 🔒 Security Features

- **Authentication**: JWT-based secure authentication
- **Password Security**: bcrypt hashing with salt
- **Input Sanitization**: Protection against XSS attacks
- **CSRF Protection**: Token-based CSRF prevention
- **SQL Injection**: Pattern detection and blocking
- **Rate Limiting**: Prevent brute force attacks

## 📊 Database Schema

- **Users**: Buyer, Seller, Admin accounts
- **Products**: Product catalog with images
- **Cart**: Shopping cart items
- **Orders**: Order history and tracking
- **Reviews**: Product ratings and reviews
- **Wishlist**: Saved products
- **Banners**: Homepage promotional banners

## 🚀 Deployment

### Backend Deployment
1. Set environment variables
2. Build: `npm run build`
3. Start: `npm start`

### Frontend Deployment
1. Update API URL in `.env`
2. Build: `npm run build`
3. Deploy `dist` folder to hosting service

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **Prabesh** - Initial work

## 🙏 Acknowledgments

- All Nepali artisans and sellers
- Open source community
- Contributors and testers

## 📞 Support

For support, email: support@madeinnepal.com

---

**Made with ❤️ for Nepal 🇳🇵**

<img width="1137" height="914" alt="image" src="https://github.com/user-attachments/assets/ca202341-09d5-4f65-a89f-4342b8d50705" /><br>
<img width="1153" height="881" alt="image" src="https://github.com/user-attachments/assets/51763da0-d59b-4a53-aa6a-14f37e35965a" /><br>



