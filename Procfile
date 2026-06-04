web: cd api && uvicorn app.main:app --host 0.0.0.0 --port $PORT --timeout-graceful-shutdown 30
worker: cd worker && python main.py
