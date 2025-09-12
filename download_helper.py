
import base64
import requests

# URL of the raw model file on a content delivery network
url = "https://media.roboflow.com/yolov8n.onnx"

try:
    # Download the model content
    response = requests.get(url, stream=True)
    response.raise_for_status() # Raise an exception for bad status codes

    # Open the output file in binary write mode
    with open("public/yolov8n.onnx", "wb") as f:
        # Stream the content to the file
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print("Model downloaded and saved successfully.")

except requests.exceptions.RequestException as e:
    print(f"Error downloading the model: {e}")
except IOError as e:
    print(f"Error writing the model to file: {e}")

