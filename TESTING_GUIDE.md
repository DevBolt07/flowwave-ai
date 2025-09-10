# Smart Traffic System - Complete Testing Guide

## System Testing Flow

### Phase 1: Authentication Testing

1. **Sign Up for Each Role**
   - Create a Citizen account (normal user)
   - Create a Traffic Authority account 
   - Create an Emergency Driver account
   - Verify email confirmation flow works

2. **Sign In Testing**
   - Test sign-in with each account
   - Verify proper role-based dashboard access
   - Test sign-out functionality

### Phase 2: Citizen Dashboard Testing

1. **Sign in as Normal User**
   - View city-wide traffic statistics
   - Check intersection status cards
   - Verify real-time data updates
   - Test intersection selection and details view

### Phase 3: Traffic Authority Dashboard Testing

1. **Sign in as Traffic Authority**
   - **Intersection Management:**
     - Select intersection from dropdown (should show Pune intersections)
     - Upload 4 videos for different lanes (North, South, East, West)
     - Verify video loop playback
     - Check AI vehicle detection overlay
   
   - **Traffic Control:**
     - Monitor lane vehicle counts
     - Test GST (Green Signal Time) calculations
     - Control traffic signal states
     - View real-time detection results

2. **Video Upload Flow:**
   - Select "FC Road & JM Road" intersection
   - Upload test videos for each lane
   - Verify videos play in continuous loop
   - Check vehicle detection bounding boxes appear
   - Monitor vehicle count updates

### Phase 4: Emergency Driver Dashboard Testing

1. **Sign in as Emergency Driver**
   - Request green corridor to destination
   - Test immediate priority activation
   - Verify corridor status updates
   - Check route visualization
   - Test ending emergency corridor

### Phase 5: System Integration Testing

1. **Multi-Role Simulation:**
   - Have Authority user upload videos and monitor intersection
   - Have Emergency user request priority corridor
   - Have Citizen user view system-wide status
   - Verify real-time updates across all dashboards

2. **AI Processing Testing:**
   - Upload traffic videos with visible vehicles
   - Verify vehicle detection API calls to `/functions/v1/vehicle-detection`
   - Check GST calculation API calls to `/functions/v1/gst-calculator`
   - Monitor database updates in real-time

### Phase 6: Data Persistence Testing

1. **Database Verification:**
   - Check intersections table has Pune locations
   - Verify lanes table updates with vehicle counts
   - Test video_feeds table stores upload data
   - Confirm logs table records all events
   - Validate emergencies table for corridor requests

### Expected Test Results

- ✅ Role-based authentication working
- ✅ Intersection dropdown populated with Pune locations
- ✅ Video upload for 4 lanes per intersection
- ✅ AI vehicle detection with bounding boxes
- ✅ Real-time vehicle count updates
- ✅ GST calculations based on traffic density
- ✅ Emergency corridor simulation
- ✅ Cross-role real-time data synchronization

### Test Data Required

- **Sample Traffic Videos:** 4 short videos showing vehicle movement
- **Test Accounts:** One account per role type
- **Intersection Data:** Pre-populated Pune intersections in database

### Debugging Steps

1. Check browser console for JavaScript errors
2. Monitor network requests for API call success
3. Verify Supabase database updates in real-time
4. Check Edge Function logs for processing errors
5. Validate video upload and playback functionality

Start with Phase 1 (Authentication) and proceed through each phase systematically.