Full stack player project


src
│
├── controllers/            # Contains business logic (user, video, etc.)
│
├── db/                     # Database connection setup (MongoDB)
│
├── middlewares/            # Custom middlewares
│   └── multer.middleware.js   # File upload handling
│
├── models/                 # Mongoose schemas & models
│   ├── user.model.js
│   └── video.model.js
│
├── routes/                 # API route definitions
│
├── utils/                  # Utility/helper functions
│   ├── ApiError.js         # Custom error class
│   ├── ApiResponse.js      # Standard API response format
│   ├── asyncHandler.js     # Async error wrapper
│   └── cloudinary.js       # Cloudinary config & upload
│
├── app.js                  # Express app configuration
├── constants.js            # Application constants
└── index.js                # Entry point (server start)
