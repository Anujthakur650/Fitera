// Test script to check workout data in the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your SQLite database
const dbPath = path.join(__dirname, 'fitera.db');

console.log('Testing user data in database...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

// Check all users
db.all(`SELECT * FROM users`, [], (err, users) => {
    if (err) {
        console.error('Error fetching users:', err);
        return;
    }
    
    console.log(`\nTotal users: ${users.length}`);
    users.forEach(user => {
        console.log(`User ${user.id}: ${user.name || 'No name'} (Firebase UID: ${user.firebase_uid || 'None'})`);
    });
});

// Check workouts per user
db.all(`
    SELECT 
        u.id as user_id,
        u.name as user_name,
        u.firebase_uid,
        COUNT(w.id) as workout_count,
        MIN(w.date) as first_workout,
        MAX(w.date) as last_workout
    FROM users u
    LEFT JOIN workouts w ON u.id = w.user_id
    GROUP BY u.id
`, [], (err, results) => {
    if (err) {
        console.error('Error fetching workout counts:', err);
        return;
    }
    
    console.log('\nWorkouts per user:');
    results.forEach(row => {
        console.log(`User ${row.user_id} (${row.user_name || 'No name'}): ${row.workout_count} workouts`);
        if (row.workout_count > 0) {
            console.log(`  First: ${row.first_workout}, Last: ${row.last_workout}`);
        }
    });
});

// Check completed workouts with exercises
db.all(`
    SELECT 
        w.id,
        w.user_id,
        w.date,
        w.is_completed,
        COUNT(DISTINCT we.id) as exercise_count,
        COUNT(DISTINCT s.id) as set_count
    FROM workouts w
    LEFT JOIN workout_exercises we ON w.id = we.workout_id
    LEFT JOIN sets s ON we.id = s.workout_exercise_id
    WHERE w.is_completed = 1
    GROUP BY w.id
    ORDER BY w.date DESC
    LIMIT 10
`, [], (err, workouts) => {
    if (err) {
        console.error('Error fetching completed workouts:', err);
        return;
    }
    
    console.log('\nLast 10 completed workouts:');
    workouts.forEach(workout => {
        console.log(`Workout ${workout.id} (User ${workout.user_id}): ${workout.date} - ${workout.exercise_count} exercises, ${workout.set_count} sets`);
    });
});

// Check exercises with personal records
db.all(`
    SELECT 
        e.name as exercise_name,
        w.user_id,
        MAX(s.weight) as max_weight,
        MAX(s.reps) as max_reps,
        COUNT(DISTINCT w.id) as workout_count
    FROM sets s
    JOIN workout_exercises we ON s.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    JOIN exercises e ON we.exercise_id = e.id
    WHERE w.is_completed = 1
        AND s.is_completed = 1
        AND s.weight > 0
    GROUP BY e.id, w.user_id
    ORDER BY e.name, w.user_id
    LIMIT 20
`, [], (err, records) => {
    if (err) {
        console.error('Error fetching personal records:', err);
        return;
    }
    
    console.log('\nPersonal records by exercise and user:');
    records.forEach(record => {
        console.log(`${record.exercise_name} (User ${record.user_id}): ${record.max_weight}lbs x ${record.max_reps} reps - ${record.workout_count} workouts`);
    });
    
    // Close the database after all queries
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('\nDatabase connection closed.');
            }
        });
    }, 1000);
});
