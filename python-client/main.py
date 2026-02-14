import cv2
import mediapipe as mp
import numpy as np
import time
import simpleaudio as sa
import os
import math

# ---------------- SETTINGS ----------------
sense_sound_file = "alert.wav"
alert_cooldown = 5
calibration_target = 30
slouch_buffer_degrees = 8
lateral_tilt_threshold_ratio = 0.07
micro_movement_window_seconds = 900
micro_movement_threshold_ratio = 0.01
micro_movement_alert_cooldown = 300
too_close_ratio = 1.25
too_close_hold_seconds = 3
too_close_alert_cooldown = 10

is_calibrated = False
calibration_frames = 0
calibration_shoulder_angles = []
calibration_neck_angles = []
calibration_torso_angles = []
calibration_shoulder_widths = []

shoulder_threshold = 0
neck_threshold = 0
torso_threshold = 0
baseline_neck_angle = 0
baseline_shoulder_angle = 0
baseline_torso_angle = 0
baseline_shoulder_width = 0
last_alert_time = 0
alert_wave = None
micro_movement_history = []
last_micro_movement_alert_time = 0
too_close_start_time = None
last_too_close_alert_time = 0

# ---------------- FUNCTIONS ----------------
def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    cosine = np.clip(cosine, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine))

    return angle

def draw_angle(frame, point, angle, color):
    cv2.putText(frame, f"{angle:.1f}", point,
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)


def angle_from_vertical(top_point, bottom_point):
    vector = np.array(top_point) - np.array(bottom_point)
    norm = np.linalg.norm(vector)
    if norm == 0:
        return 0

    vertical = np.array([0, -1])
    cosine = np.dot(vector, vertical) / norm
    cosine = np.clip(cosine, -1.0, 1.0)
    return np.degrees(np.arccos(cosine))


def landmark_point(landmarks, idx, width, height):
    landmark = landmarks[idx]
    return (int(landmark.x * width), int(landmark.y * height))


def midpoint(p1, p2):
    return ((p1[0] + p2[0]) // 2, (p1[1] + p2[1]) // 2)

# ---------------- INIT ----------------
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

pose = mp_pose.Pose(
    static_image_mode=False,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6
)

cap = cv2.VideoCapture(0)

if os.path.exists(sense_sound_file):
    try:
        alert_wave = sa.WaveObject.from_wave_file(sense_sound_file)
    except Exception as exc:
        print(f"Unable to load alert sound: {exc}")

# ---------------- MAIN LOOP ----------------
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        continue

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)

    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark

        h, w = frame.shape[:2]

        left_shoulder = landmark_point(landmarks, mp_pose.PoseLandmark.LEFT_SHOULDER.value, w, h)
        right_shoulder = landmark_point(landmarks, mp_pose.PoseLandmark.RIGHT_SHOULDER.value, w, h)
        left_ear = landmark_point(landmarks, mp_pose.PoseLandmark.LEFT_EAR.value, w, h)
        right_ear = landmark_point(landmarks, mp_pose.PoseLandmark.RIGHT_EAR.value, w, h)
        left_hip = landmark_point(landmarks, mp_pose.PoseLandmark.LEFT_HIP.value, w, h)
        right_hip = landmark_point(landmarks, mp_pose.PoseLandmark.RIGHT_HIP.value, w, h)
        shoulder_angle = calculate_angle(left_shoulder, right_shoulder, (right_shoulder[0], 0))
        neck_angle = calculate_angle(left_ear, left_shoulder, (left_shoulder[0], 0))
        torso_angle = angle_from_vertical(midpoint(left_shoulder, right_shoulder), midpoint(left_hip, right_hip))
        shoulder_width = math.dist(left_shoulder, right_shoulder)
        shoulder_mid = midpoint(left_shoulder, right_shoulder)
        shoulder_tilt_pixels = abs(left_shoulder[1] - right_shoulder[1])

        if not is_calibrated and calibration_frames < calibration_target:
            calibration_shoulder_angles.append(shoulder_angle)
            calibration_neck_angles.append(neck_angle)
            calibration_torso_angles.append(torso_angle)
            calibration_shoulder_widths.append(shoulder_width)
            calibration_frames += 1

            cv2.putText(frame, f"Calibrating {calibration_frames}/{calibration_target}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (0, 255, 255), 2)

        elif not is_calibrated:
            baseline_shoulder_angle = np.mean(calibration_shoulder_angles)
            baseline_neck_angle = np.mean(calibration_neck_angles)
            baseline_torso_angle = np.mean(calibration_torso_angles)
            baseline_shoulder_width = np.mean(calibration_shoulder_widths)

            shoulder_threshold = baseline_shoulder_angle - slouch_buffer_degrees
            neck_threshold = baseline_neck_angle - slouch_buffer_degrees
            torso_threshold = baseline_torso_angle + slouch_buffer_degrees
            is_calibrated = True
            print("Calibration complete")

        mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        draw_angle(frame, left_shoulder, shoulder_angle, (255, 0, 0))
        draw_angle(frame, left_ear, neck_angle, (0, 255, 0))

        if is_calibrated:
            current_time = time.time()

            lateral_tilt = shoulder_tilt_pixels > (shoulder_width * lateral_tilt_threshold_ratio)

            slouching = (
                shoulder_angle < shoulder_threshold or
                neck_angle < neck_threshold or
                torso_angle > torso_threshold or
                lateral_tilt
            )

            micro_movement_history.append((current_time, shoulder_mid))
            micro_movement_history = [
                (ts, pt) for ts, pt in micro_movement_history
                if current_time - ts <= micro_movement_window_seconds
            ]

            if len(micro_movement_history) >= 2:
                xs = [pt[0] for _, pt in micro_movement_history]
                ys = [pt[1] for _, pt in micro_movement_history]
                movement_span = math.dist((min(xs), min(ys)), (max(xs), max(ys)))
            else:
                movement_span = 0

            micro_movement_stagnant = movement_span < (shoulder_width * micro_movement_threshold_ratio)

            too_close_limit = baseline_shoulder_width * too_close_ratio
            is_too_close_now = shoulder_width > too_close_limit

            if is_too_close_now:
                if too_close_start_time is None:
                    too_close_start_time = current_time
            else:
                too_close_start_time = None

            too_close_detected = (
                too_close_start_time is not None and
                (current_time - too_close_start_time) >= too_close_hold_seconds
            )

            bad_posture = slouching or too_close_detected

            if bad_posture:
                status = "Bad Posture"
                color = (0, 0, 255)
            else:
                status = "Good Posture"
                color = (0, 255, 0)

            if slouching and current_time - last_alert_time > alert_cooldown:
                print("Fix your posture!")
                if alert_wave:
                    try:
                        alert_wave.play()
                    except Exception as exc:
                        print(f"Audio playback failed: {exc}")
                last_alert_time = current_time

            if micro_movement_stagnant and current_time - last_micro_movement_alert_time > micro_movement_alert_cooldown:
                print("You've been frozen too long, take a stretch break!")
                if alert_wave:
                    try:
                        alert_wave.play()
                    except Exception as exc:
                        print(f"Audio playback failed: {exc}")
                last_micro_movement_alert_time = current_time

            if too_close_detected and current_time - last_too_close_alert_time > too_close_alert_cooldown:
                print("Too Close to Screen!")
                if alert_wave:
                    try:
                        alert_wave.play()
                    except Exception as exc:
                        print(f"Audio playback failed: {exc}")
                last_too_close_alert_time = current_time

            cv2.putText(frame, status, (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

            cv2.putText(frame, f"Shoulder {shoulder_angle:.1f}/{shoulder_threshold:.1f}",
                        (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 1)

            cv2.putText(frame, f"Neck {neck_angle:.1f}/{neck_threshold:.1f}",
                        (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 1)

            cv2.putText(frame, f"Torso {torso_angle:.1f}/{torso_threshold:.1f}",
                        (10, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 1)

            cv2.putText(frame, f"Lateral tilt {shoulder_tilt_pixels:.0f}px/{shoulder_width * lateral_tilt_threshold_ratio:.0f}px",
                        (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 1)

            if micro_movement_stagnant:
                cv2.putText(frame, "Micro-movement: STAGNANT",
                            (10, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                            (0, 0, 255), 2)
            else:
                cv2.putText(frame, "Micro-movement: OK",
                            (10, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                            (0, 255, 0), 1)

            too_close_status = "Distance: TOO CLOSE" if too_close_detected else "Distance: OK"
            too_close_color = (0, 0, 255) if too_close_detected else (0, 255, 0)
            cv2.putText(frame, too_close_status,
                        (10, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        too_close_color, 2)

    cv2.imshow("Posture Corrector", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
