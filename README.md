Full stack player project


src/
│
├── controllers/        # Business logic (user, video, etc.)
├── db/                 # Database connection setup
├── middlewares/        # Custom middlewares (multer, auth, etc.)
├── models/             # Mongoose models
│   ├── user.model.js
│   └── video.model.js
│
├── routes/             # API routes
├── utils/              # Utility functions
│   ├── ApiError.js
│   ├── ApiResponse.js
│   ├── asyncHandler.js
│   └── cloudinary.js
│
├── app.js              # Express app configuration
├── constants.js        # App constants
└── index.js            # Entry point