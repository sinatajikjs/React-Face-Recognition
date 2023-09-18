import * as faceapi from "face-api.js";
import { useEffect, useRef, useState } from "react";

export default () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  function getLabeledFaceDescriptions() {
    const labels = ["Sina", "RDJ", "Obama", "The Rock", "Eminem", "Tom Hardy"];
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 2; i++) {
          const img = await faceapi.fetchImage(`./labels/${label}/${i}.png`);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detections) descriptions.push(detections.descriptor);
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  }

  useEffect(() => {
    const asyncFunc = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        videoRef.current!.srcObject = stream;

        // second func

        const labeledFaceDescriptors = await getLabeledFaceDescriptions();
        const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

        const canvas = faceapi.createCanvasFromMedia(videoRef.current!);
        document.body.append(canvas);

        const displaySize = {
          width: videoRef.current!.width,
          height: videoRef.current!.height,
        };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
          const detections = await faceapi
            .detectAllFaces(videoRef.current!)
            .withFaceLandmarks()
            .withFaceDescriptors();

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );

          canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);

          const results = resizedDetections.map((d) => {
            return faceMatcher.findBestMatch(d.descriptor);
          });
          results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box;
            console.log(result.label);
            const drawBox = new faceapi.draw.DrawBox(box, {
              label: result.label,
            });
            drawBox.draw(canvas);
          });
        }, 100);
      } catch (error) {
        console.error(error);
      }
    };
    asyncFunc();
  }, []);

  return <video width="600" height="450" ref={videoRef} autoPlay></video>;
};
