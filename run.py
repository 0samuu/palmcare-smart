import uvicorn
import sys
import os

if __name__ == "__main__":
    # Ensure current dir is in sys.path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
        
    print("==================================================================")
    print("      PALMCARE PRECISION AGRITECH OS - LOCAL SERVER")
    print("   Cybernetic Date Palm Health & Precision Intervention v4.2")
    print("==================================================================")
    print("   Application Web UI:  http://127.0.0.1:8000")
    print("   Interactive API Docs: http://127.0.0.1:8000/docs")
    print("==================================================================")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, log_level="info")
