"""
ML Model Loader
Loads trained neural network models for anomaly detection, fund flow, and leakage prediction
"""
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional

# Try to import TensorFlow, fallback gracefully if not available
try:
    import tensorflow as tf
    from tensorflow import keras
    TF_AVAILABLE = True
    print("✓ TensorFlow available for ML model loading")
except (ImportError, Exception) as e:
    TF_AVAILABLE = False
    print(f"⚠️  TensorFlow not available ({type(e).__name__}). Using fallback logic.")

MODELS_DIR = Path(__file__).parent / "models"

class ModelLoader:
    """Singleton class to load and cache ML models"""
    
    _instance = None
    _models = {}
    _stats = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self.load_all_models()
    
    def load_all_models(self):
        """Load all available models at startup"""
        if not TF_AVAILABLE:
            print("Skipping model loading - TensorFlow not available")
            return
        
        model_files = {
            'anomaly': 'anomaly_detector.h5',
            'fund_flow': 'fund_flow_inefficiency.h5',
            'leakage': 'leakage_detector.h5'
        }
        
        stats_files = {
            'anomaly': 'model_stats.json',
            'fund_flow': 'fund_flow_stats.json',
            'leakage': 'leakage_stats.json'
        }
        
        for name, filename in model_files.items():
            model_path = MODELS_DIR / filename
            stats_path = MODELS_DIR / stats_files.get(name, 'model_stats.json')
            
            try:
                if model_path.exists():
                    self._models[name] = keras.models.load_model(model_path)
                    print(f"✓ Loaded {name} model from {filename}")
                else:
                    print(f"⚠️  Model file not found: {filename}")
            except Exception as e:
                print(f"✗ Failed to load {name} model: {e}")
            
            # Load model stats
            try:
                if stats_path.exists():
                    with open(stats_path, 'r') as f:
                        self._stats[name] = json.load(f)
                    print(f"✓ Loaded {name} stats from {stats_path.name}")
            except Exception as e:
                print(f"⚠️  Failed to load {name} stats: {e}")
    
    def get_model(self, name: str) -> Optional[Any]:
        """Get a loaded model by name"""
        return self._models.get(name)
    
    def get_stats(self, name: str) -> Optional[Dict[str, Any]]:
        """Get model statistics"""
        return self._stats.get(name)
    
    def predict_anomaly(self, features: np.ndarray) -> float:
        """
        Predict anomaly probability for transaction features
        
        Args:
            features: numpy array of shape (n_samples, n_features)
        
        Returns:
            Anomaly probability (0-1)
        """
        model = self.get_model('anomaly')
        if model is None:
            # Fallback: simple heuristic based on amount outliers
            return self._fallback_anomaly_score(features)
        
        try:
            predictions = model.predict(features, verbose=0)
            return float(predictions[0][0])
        except Exception as e:
            print(f"Anomaly prediction error: {e}")
            return self._fallback_anomaly_score(features)
    
    def predict_fund_flow_efficiency(self, features: np.ndarray) -> float:
        """
        Predict fund flow efficiency score
        
        Args:
            features: numpy array of fund flow features
        
        Returns:
            Efficiency score (0-1, higher is better)
        """
        model = self.get_model('fund_flow')
        if model is None:
            return 0.75  # Default moderate efficiency
        
        try:
            predictions = model.predict(features, verbose=0)
            return float(predictions[0][0])
        except Exception as e:
            print(f"Fund flow prediction error: {e}")
            return 0.75
    
    def predict_leakage_risk(self, features: np.ndarray) -> float:
        """
        Predict budget leakage/lapse risk
        
        Args:
            features: numpy array of department utilization features
        
        Returns:
            Leakage risk probability (0-1)
        """
        model = self.get_model('leakage')
        if model is None:
            # Fallback: simple underutilization check
            return self._fallback_leakage_score(features)
        
        try:
            predictions = model.predict(features, verbose=0)
            return float(predictions[0][0])
        except Exception as e:
            print(f"Leakage prediction error: {e}")
            return self._fallback_leakage_score(features)
    
    def _fallback_anomaly_score(self, features: np.ndarray) -> float:
        """Fallback anomaly scoring without ML model"""
        # Simple z-score based outlier detection
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # Assume first feature is amount - flag high values
        if features.shape[1] > 0:
            amount = features[0, 0]
            # Simple threshold: >3 std devs
            if amount > 10:  # Normalized amount
                return 0.8
        return 0.3
    
    def _fallback_leakage_score(self, features: np.ndarray) -> float:
        """Fallback leakage scoring without ML model"""
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # Assume utilization % is in features
        if features.shape[1] > 2:
            utilization = features[0, 2]
            if utilization < 0.5:  # <50% utilization
                return 0.85
            elif utilization < 0.7:
                return 0.5
        return 0.2
    
    @property
    def models_available(self) -> bool:
        """Check if any models are loaded"""
        return len(self._models) > 0

# Global model loader instance
model_loader = ModelLoader()
