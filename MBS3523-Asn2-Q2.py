import cv2
import numpy as np
import serial
import time
cam = cv2.VideoCapture(0)
ser = serial.Serial('COM4', baudrate=115200, timeout=1)
time.sleep(0.5)
pos = 90
cv2.namedWindow('MBS3523')
def NIL(x):
    pass

cv2.createTrackbar('HH', 'MBS3523', 5, 179, NIL)
cv2.createTrackbar('HL', 'MBS3523', 0, 179, NIL)
cv2.createTrackbar('SH', 'MBS3523', 255, 255, NIL)
cv2.createTrackbar('SL', 'MBS3523', 110, 255, NIL)
cv2.createTrackbar('VH', 'MBS3523', 255, 255, NIL)
cv2.createTrackbar('VL', 'MBS3523', 70, 255, NIL)
while True:
    ret, img = cam.read()
    imgHSV = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hueLow = cv2.getTrackbarPos('HL', 'MBS3523')
    hueHigh = cv2.getTrackbarPos('HH', 'MBS3523')
    satLow = cv2.getTrackbarPos('SL', 'MBS3523')
    satHigh = cv2.getTrackbarPos('SH', 'MBS3523')
    valueLow = cv2.getTrackbarPos('VL', 'MBS3523')
    valueHigh = cv2.getTrackbarPos('VH', 'MBS3523')
    mask1 = cv2.inRange(imgHSV, (hueLow, satLow, valueLow), (hueHigh, satHigh, valueHigh))
    cv2.imshow('Mask1', mask1)
    Contours, no_use = cv2.findContours(mask1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for count in Contours:
        area = cv2.contourArea(count)
        (x, y, w, h) = cv2.boundingRect(count)
        if area > 100:
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 0, 255), 1)
        errorPan = (x + w/2) - 640/2
        if pos > 160:
            pos = 160
        if abs(errorPan) > 20:
            pos = pos - errorPan/30
        if pos < 0:
            pos = 0
        servoPos = str(pos) + '\r'
        ser.write(servoPos.encode())
        time.sleep(0.1)
    cv2.imshow('MBS3523 Webcam', img)

    if cv2.waitKey(5) & 0xff == 27:
        break

ser.close()
cam.release()
cv2.destroyAllWindows()
