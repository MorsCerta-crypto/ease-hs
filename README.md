# Safety Floor Planner

A web-based floor planner application for creating safety-focused floor plans. This tool allows users to draw facility layouts with safety elements like emergency exits, machines, and hazardous material storage.

## Features

- **Create and edit walls** - Draw the structure of your facility
- **Add doors** - Two types: standard (gray) and emergency exits (red)
- **Add windows** - For ventilation and emergency access
- **Add machines** - Place and label equipment with safety information
- **Add safety closets** - Mark storage areas for dangerous materials
- **Save and load floor plans** - Store your designs for later use
- **Export as PNG** - Create image files of your floor plans

## Getting Started

### Prerequisites

- Python 3.12 or higher

### Installation

1. Clone the repository
2. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Application

```bash
python main.py
```

The application will be available at http://localhost:5001

## Usage

1. **Create a new floor plan**:
   - Click "New Floor Plan"
   - Enter dimensions and name
   - Click "Create"

2. **Add elements**:
   - Select a tool from the left sidebar (Wall, Door, Window, etc.)
   - Click and drag on the canvas to place the element
   - Use the Properties panel on the right to edit the selected element

3. **Save your work**:
   - Click "Save" to store your floor plan
   - Floor plans are saved in the `data/` directory as JSON files

4. **Export your floor plan**:
   - Click "Export as PNG" to download an image of your floor plan

## Built With

- [FastHTML](https://github.com/fastapi-mvc/fasthtml) - Web framework
- [MonsterUI](https://github.com/monster-ui/monster-ui) - UI components
- HTML5 Canvas - For the drawing functionality

## License

This project is open source.