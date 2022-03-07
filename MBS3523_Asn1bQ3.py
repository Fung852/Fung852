import cv2
print(cv2.__version__)
capture = cv2.VideoCapture(0)
capture.set(3,640)
capture.set(4,480)
x = 0
dx = 1
y = 0
dy = 1

while True:
    success, img = capture.read()
    cv2.putText(img, "MBS3523 Assignment 1b-Q3 Name: Tse Ming Fung",(70,20), cv2.FONT_HERSHEY_PLAIN,1.2,(255,0,255),2)
    cv2.rectangle(img, (x, y), (x + 80, y + 80), (0, 255, 255), 5)
    x = x + dx
    y = y + dy
    if x >= 560 or x <= 0:
        dx=dx*(-1)
    if y >= 400 or y <= 0:
        dy = dy*(-1)
    cv2.imshow('Frame', img)
    if cv2.waitKey(20) & 0xff == ord('q'):
        break

capture.release()
cv2.destroyAllWindows()

