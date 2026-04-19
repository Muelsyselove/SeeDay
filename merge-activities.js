import { Database } from 'bun:sqlite';

// Connect to the database
const db = new Database('/data/live-dashboard.db');

// Get all activities ordered by device_id and started_at
const activities = db.prepare('SELECT * FROM activities ORDER BY device_id, started_at ASC').all();

// Group activities by device
const activitiesByDevice = {};
for (const activity of activities) {
  if (!activitiesByDevice[activity.device_id]) {
    activitiesByDevice[activity.device_id] = [];
  }
  activitiesByDevice[activity.device_id].push(activity);
}

// Merge consecutive activities
const mergedActivities = [];
for (const deviceId in activitiesByDevice) {
  const deviceActivities = activitiesByDevice[deviceId];
  let currentMerge = null;
  
  for (const activity of deviceActivities) {
    if (!currentMerge) {
      // Start a new merge group
      currentMerge = {
        ...activity
      };
    } else if (
      currentMerge.app_id === activity.app_id &&
      currentMerge.device_id === activity.device_id &&
      currentMerge.is_foreground === activity.is_foreground
    ) {
      // Merge with current group
      currentMerge.duration_minutes = (currentMerge.duration_minutes || 0) + (activity.duration_minutes || 0);
      currentMerge.ended_at = activity.ended_at;
      // Update display title to the latest one
      if (activity.display_title) {
        currentMerge.display_title = activity.display_title;
      }
    } else {
      // End current merge group and start a new one
      mergedActivities.push(currentMerge);
      currentMerge = {
        ...activity
      };
    }
  }
  
  // Add the last merge group
  if (currentMerge) {
    mergedActivities.push(currentMerge);
  }
}

// Clear existing activities
console.log('Clearing existing activities...');
db.run('DELETE FROM activities');

// Insert merged activities
console.log('Inserting merged activities...');
const insertActivity = db.prepare(`
  INSERT INTO activities (device_id, device_name, platform, app_id, app_name, window_title, display_title, title_hash, time_bucket, started_at, is_foreground)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
for (const activity of mergedActivities) {
  insertActivity.run(
    activity.device_id,
    activity.device_name,
    activity.platform,
    activity.app_id,
    activity.app_name,
    activity.window_title || '',
    activity.display_title || '',
    activity.title_hash || '',
    activity.time_bucket || 0,
    activity.started_at,
    activity.is_foreground || 1
  );
  count++;
}

console.log(`Merged ${activities.length} activities into ${count} merged activities`);

db.close();
console.log('Merge completed successfully!');
