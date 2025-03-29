from dataclasses import dataclass, field
from typing import List, Dict, Any, Literal, Optional
import json
import uuid

# Element types
ElementType = Literal["wall", "door-standard", "door-emergency", "window", "machine", "closet"]

@dataclass
class Point:
    x: float
    y: float
    
    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y}
    
    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> 'Point':
        return cls(x=data.get("x", 0), y=data.get("y", 0))

@dataclass
class FloorPlanElement:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    element_type: ElementType = "wall"
    start: Point = field(default_factory=lambda: Point(0, 0))
    end: Point = field(default_factory=lambda: Point(0, 0))
    width: float = 0.2
    rotation: float = 0.0
    properties: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "element_type": self.element_type,
            "start": self.start.to_dict(),
            "end": self.end.to_dict(),
            "width": self.width,
            "rotation": self.rotation,
            "properties": self.properties
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FloorPlanElement':
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            element_type=data.get("element_type", "wall"),
            start=Point.from_dict(data.get("start", {"x": 0, "y": 0})),
            end=Point.from_dict(data.get("end", {"x": 0, "y": 0})),
            width=data.get("width", 0.2),
            rotation=data.get("rotation", 0.0),
            properties=data.get("properties", {})
        )

@dataclass
class FloorPlan:
    id: str
    name: str
    width: float = 20.0
    height: float = 15.0
    elements: List[FloorPlanElement] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "width": self.width,
            "height": self.height,
            "elements": [element.to_dict() for element in self.elements]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FloorPlan':
        elements = [FloorPlanElement.from_dict(elem) for elem in data.get("elements", [])]
        return cls(
            id=data.get("id", ""),
            name=data.get("name", "Untitled"),
            width=data.get("width", 20.0),
            height=data.get("height", 15.0),
            elements=elements
        )
    
    def save_to_file(self, file_path: str) -> None:
        """Save the floor plan to a JSON file"""
        with open(file_path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load_from_file(cls, file_path: str) -> 'FloorPlan':
        """Load a floor plan from a JSON file"""
        with open(file_path, "r") as f:
            data = json.load(f)
        return cls.from_dict(data)
    
    def add_element(self, element: FloorPlanElement) -> None:
        """Add an element to the floor plan"""
        self.elements.append(element)
    
    def remove_element(self, element_id: str) -> bool:
        """Remove an element from the floor plan by ID"""
        for i, element in enumerate(self.elements):
            if element.id == element_id:
                self.elements.pop(i)
                return True
        return False
    
    def update_element(self, element_id: str, updated_element: FloorPlanElement) -> bool:
        """Update an existing element"""
        for i, element in enumerate(self.elements):
            if element.id == element_id:
                self.elements[i] = updated_element
                return True
        return False
    
    def get_element(self, element_id: str) -> Optional[FloorPlanElement]:
        """Get an element by ID"""
        for element in self.elements:
            if element.id == element_id:
                return element
        return None
