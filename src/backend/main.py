from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db

# Tạo bảng (Trong thực tế nên dùng Alembic migrations)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chinese Learning API",
    description="Backend API cho trang web học tiếng Trung",
    version="1.0.0"
)

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong thực tế nên giới hạn domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Chinese Learning API"}

@app.get("/api/vocabularies")
def get_vocabularies(db: Session = Depends(get_db)):
    vocabularies = db.query(models.Vocabulary).all()
    return {"data": vocabularies}

@app.get("/health")
def health_check():
    return {"status": "ok"}
