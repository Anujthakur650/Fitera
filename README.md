# 💪 StrongClone - Complete Fitness Tracking App

A fully-featured React Native fitness tracking application that perfectly clones the STRONG app experience with all professional features.

## 🚀 Features

### 🏠 **Dashboard (HomeScreen)**
- **Active Workout Display** - Live timer, stats, and continue/finish options
- **Quick Start Options** - Empty workout or template-based workouts
- **Progress Statistics** - Total workouts, weekly count, volume tracking
- **Recent Workout History** - Previous sessions with duration display
- **New Workout Modal** - Template selection and workout creation

### 🏋️ **Active Workout Tracking (WorkoutScreen)**
- **Real-time Workout Timer** - Live session timing
- **Exercise Management** - Add, remove, reorder exercises from comprehensive library
- **Advanced Set Logging** - Weight, reps, warmup indicators
- **Performance Tracking** - PR detection, previous workout comparison
- **Rest Timer** - Automatic countdown with vibration alerts
- **Workout Statistics** - Live stats (exercises, sets, total volume)
- **Workout Notes** - Detailed session commentary
- **Plate Calculator** - Automatic plate breakdown for any weight
- **Set Actions** - Copy previous set, delete sets, quick actions

### 📚 **Exercise Library (ExercisesScreen)**
- **Comprehensive Database** - 27+ pre-seeded exercises across 7 categories
- **Category Filtering** - Chest, Back, Shoulders, Arms, Legs, Core, Cardio
- **Smart Search** - Search by exercise name or muscle groups
- **Custom Exercises** - Create and manage personal exercises
- **Exercise Details** - Complete information with instructions
- **Add to Workout** - Seamless integration with active workouts
- **Visual Indicators** - Custom badge for user-created exercises

### 👤 **Profile & Settings (ProfileScreen)**
- **User Profile Management** - Name, email, physical stats
- **Workout Statistics Dashboard** - Total workouts, volume, exercise tracking
- **Body Measurements** - Weight, body fat, muscle mass tracking
- **App Settings** - Notifications, sounds, vibrations, auto-timers
- **Data Management** - Export data, clear all data functionality
- **App Information** - Version, help, support links

## 🛠️ Technical Stack

### **Frontend (React Native + Expo)**
- **React Native** - Cross-platform mobile development
- **Expo SDK 53** - Development platform and build tools
- **React Navigation** - Bottom tab navigation
- **SQLite** - Local database storage
- **Context API** - Global state management
- **Material Icons** - Professional iconography

### **Backend (Node.js + Express)**
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **MongoDB** - Database (configured but frontend uses SQLite)
- **JWT Authentication** - Secure user sessions
- **RESTful APIs** - Clean API design

### **Database Schema**
- **Users** - Profile and authentication data
- **Exercise Categories** - Organized muscle group categories
- **Exercises** - Comprehensive exercise library with custom support
- **Workouts** - Session tracking with timestamps and notes
- **Workout Exercises** - Exercise-workout relationships
- **Sets** - Individual set data with performance tracking
- **Body Measurements** - Progress tracking over time
- **Templates** - Reusable workout templates

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd StrongClone
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

### **Running the Application**

1. **Start the Frontend (Expo)**
   ```bash
   cd frontend
   npx expo start
   ```
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS Simulator
   - Or press `a` for Android Emulator

2. **Start the Backend (Optional)**
   ```bash
   cd backend
   npm start
   ```
   - Backend runs on `http://localhost:5000`
   - Frontend uses SQLite for local storage

## 📱 App Screens

### **Home Dashboard**
- Quick workout start options
- Active workout continuation
- Progress statistics overview
- Recent workout history

### **Active Workout**
- Live workout timer and stats
- Exercise library integration
- Set logging with performance indicators
- Rest timer with notifications
- Workout notes and plate calculator

### **Exercise Library**
- Categorized exercise browser
- Search and filter functionality
- Custom exercise creation
- Exercise details and instructions

### **Profile & Settings**
- User profile management
- Workout statistics dashboard
- Body measurement tracking
- App preferences and settings

## 🗄️ Database Features

### **Local SQLite Database**
- **Offline-first** - Works without internet connection
- **Data Persistence** - All workouts and progress saved locally
- **Relational Structure** - Proper foreign key relationships
- **Pre-seeded Data** - 27+ exercises across 7 categories
- **Migration Support** - Database schema versioning

### **Key Tables**
- `users` - User profile data
- `exercise_categories` - Muscle group categories
- `exercises` - Exercise library (pre-seeded + custom)
- `workouts` - Workout sessions
- `workout_exercises` - Exercise-workout relationships
- `sets` - Individual set performance data
- `body_measurements` - Progress tracking data

## 🎨 UI/UX Features

### **Modern Design**
- **iOS-style Interface** - Clean, professional design
- **Consistent Typography** - Proper font hierarchy
- **Material Icons** - Professional iconography
- **Responsive Layout** - Optimized for all screen sizes

### **User Experience**
- **Intuitive Navigation** - Easy-to-use bottom tabs
- **Modal Presentations** - iOS-style modal interfaces
- **Loading States** - Proper feedback during operations
- **Error Handling** - User-friendly error messages
- **Performance Indicators** - Visual feedback for achievements

## 🔧 Advanced Features

### **Performance Tracking**
- **Personal Records (PR)** - Automatic detection and display
- **Previous Workout Comparison** - Show last performance
- **Volume Calculations** - Real-time workout volume tracking
- **Progress Statistics** - Comprehensive workout analytics

### **Smart Functionality**
- **Rest Timer Automation** - Automatic rest period suggestions
- **Plate Calculator** - Olympic barbell plate breakdown
- **Set Copying** - Quick set duplication
- **Exercise Templates** - Reusable workout structures

### **Data Management**
- **Export Functionality** - Backup workout data
- **Data Clearing** - Safe data management options
- **Custom Exercises** - User-created exercise support
- **Workout Notes** - Session commentary and tracking

## 📊 Advanced Analytics & Intelligence

### **Professional-Grade Analytics Dashboard**
- **Overall Fitness Score** - Comprehensive rating with Elite/Advanced/Intermediate classifications
- **Muscle Group Balance Analysis** - Automatic imbalance detection with personalized recommendations
- **Strength Ratio Analysis** - Professional strength standards with injury prevention insights
- **Progression Trend Analysis** - Multi-metric tracking with performance projections
- **Personal Records Tracking** - Estimated 1RM calculations and achievement milestones
- **Workout Frequency Analysis** - Consistency scoring and optimal frequency recommendations
- **Volume Distribution Analysis** - Training load management and overtraining prevention

### **Intelligent Insights & Recommendations**
- **Imbalance Detection** - Identifies overworked/underworked muscle groups
- **Performance Predictions** - AI-powered projections based on training trends
- **Injury Prevention** - Early warning system for training imbalances
- **Plateau Detection** - Automatic identification of stagnant progress
- **Personalized Recommendations** - Custom training adjustments based on data analysis

### **Advanced Metrics**
- **Strength Ratios** - Bench/Row, Squat/Deadlift, Overhead/Bench press ratios
- **Consistency Scoring** - Training regularity and pattern analysis
- **Volume Trends** - Weekly/monthly training load progression
- **Exercise Variety** - Movement pattern diversity tracking
- **Performance Efficiency** - Volume per minute and intensity analysis

## 🔒 Data Privacy

- **Local Storage** - All data stored locally on device
- **No Cloud Dependency** - Works completely offline
- **User Control** - Complete data ownership
- **Export Options** - Data portability

## 🚧 Future Enhancements

- **Cloud Sync** - Optional cloud backup and cross-device synchronization
- **Social Features** - Workout sharing, friend connections, and leaderboards  
- **AI Coaching** - Machine learning-powered form analysis and program recommendations
- **Wearable Integration** - Apple Watch, Fitbit, and heart rate monitor connectivity
- **Nutrition Tracking** - Comprehensive meal planning and macro tracking
- **Video Demonstrations** - Exercise form guides and custom workout videos
- **Advanced Periodization** - Automatic training cycle management and deload weeks

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For questions, support, or feedback, please contact the development team.

---

**StrongClone** - A complete fitness tracking solution with all the features you need to track, analyze, and improve your workout performance. 💪 