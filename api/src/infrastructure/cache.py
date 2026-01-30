"""Thread-safe cache implementation"""

import threading
from collections.abc import Callable
from typing import Any, Generic, TypeVar

T = TypeVar("T")


class ThreadSafeCache(Generic[T]):
    """Cache thread-safe avec expiration optionnelle"""

    def __init__(self):
        self._data: dict[Any, T] = {}
        self._lock = threading.RLock()

    def get(self, key: Any) -> T | None:
        """Obtenir une valeur du cache"""
        with self._lock:
            return self._data.get(key)

    def set(self, key: Any, value: T) -> None:
        """Ajouter/mettre à jour une valeur en cache"""
        with self._lock:
            self._data[key] = value

    def get_or_set(self, key: Any, factory: Callable[[], T]) -> T:
        """Obtenir une valeur ou la créer avec factory si absent"""
        with self._lock:
            if key not in self._data:
                self._data[key] = factory()
            return self._data[key]

    def clear(self) -> None:
        """Vider le cache"""
        with self._lock:
            self._data.clear()

    def __contains__(self, key: Any) -> bool:
        """Vérifier si clé existe"""
        with self._lock:
            return key in self._data
