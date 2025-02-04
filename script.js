(function () {
  let inGameStarted = false;
  let jumpScareCounter = 0;
  const brightnessThreshold = 50; // Average brightness threshold (0-255)
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // Initialize the camera stream (using the environment-facing camera when possible)
  async function initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = stream;
      video.play();
      video.addEventListener("loadeddata", function () {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        requestAnimationFrame(checkAmbientLight);
      });
    } catch (err) {
      console.error("Error accessing camera:", err);
      document.getElementById("instruct").textContent =
        "Error: Unable to access camera.";
    }
  }

  // Calculate the average brightness of the given image data using luminance formula
  function calculateBrightness(imageData) {
    const data = imageData.data;
    let colorSum = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      // Using luminance: 0.299R + 0.587G + 0.114B
      colorSum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    return colorSum / pixels;
  }

  // Continuously check the ambient light using the camera feed
  function checkAmbientLight() {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(checkAmbientLight);
      return;
    }
    // Draw current frame to canvas and extract brightness data
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const brightness = calculateBrightness(imageData);

    if (brightness < brightnessThreshold) {
      startGame();
    } else {
      requestAnimationFrame(checkAmbientLight);
    }
  }

  // Start the game once darkness has been detected
  function startGame() {
    if (inGameStarted) return;
    inGameStarted = true;
    // Hide the initial instruction overlay
    document.getElementById("instruct").style.display = "none";
    // Optionally, you might want to stop the camera stream here to free up the device.
    scheduleNextJumpScare();
  }

  // Schedule the next jump scare event at a random interval between 5-10 seconds
  function scheduleNextJumpScare() {
    const delay = 5000 + Math.random() * 5000;
    setTimeout(jumpScareEvent, delay);
  }

  // Trigger one jump scare event:
  // Fetch a horror description from the AI, create a jump scare image with the LLM response,
  // then update its src to an SVG so that it animates and scares the player.
  async function jumpScareEvent() {
    let description;
    try {
      description = await getAIResponse();
    } catch (err) {
      console.error("Error getting AI response:", err);
      description =
        "A monstrous figure materializes from the void, its eyes ablaze with malevolence.";
    }
    jumpScareCounter++;
    const imgId = "jumpscare-" + jumpScareCounter;
    const img = document.createElement("img");
    img.id = imgId;
    // Set the LLM response as both the alt text and initial src (as plain text)
    img.alt = description;
    img.src = "data:text/plain," + encodeURIComponent(description);

    // Prepare the image to cover the whole screen
    img.style.position = "fixed";
    img.style.top = "0";
    img.style.left = "0";
    img.style.width = "100vw";
    img.style.height = "100vh";
    img.style.zIndex = "9999";
    img.style.pointerEvents = "none";
    img.style.display = "none";

    document.body.appendChild(img);

    // After a short delay, change the src to a valid SVG data URL so that it can load
    // and trigger the jump scare animation.
    setTimeout(() => {
      const svgDataUrl = generateSvgForDescription(description);
      img.src = svgDataUrl;
      img.style.display = "block";
      img.classList.add("jumpscare");

      // When the animation completes, remove the image and schedule the next jump scare.
      img.addEventListener("animationend", () => {
        if (img && img.parentNode) {
          img.parentNode.removeChild(img);
        }
        scheduleNextJumpScare();
      });
    }, 200);
  }

  // Call the language model API to generate a horrifying description.
  async function getAIResponse() {
    const prompt =
      "Generate a horrifying description for a jump scare in a horror game. " +
      "Be as terrifying and unsettling as possible, evoking images of dread and despair.";
    try {
      const response = await fetch("/api/ai_completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ prompt: prompt }),
      });
      const data = await response.json();
      // Expect the API returns an object with a "description" field.
      return data.description || "An unspeakable horror reveals itself from the abyss.";
    } catch (error) {
      console.error("Error fetching AI response:", error);
      return "An unspeakable horror reveals itself from the abyss.";
    }
  }

  // Generate an inline SVG as a data URL embedding the horror description.
  // This SVG will serve as the jump scare image.
  function generateSvgForDescription(description) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
  <rect width="100%" height="100%" fill="black"/>
  <text x="50%" y="50%" fill="red" font-size="24" font-family="serif" dominant-baseline="middle" text-anchor="middle">
    ${description}
  </text>
</svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  // Begin the process when the window loads.
  window.addEventListener("load", initCamera);
})();