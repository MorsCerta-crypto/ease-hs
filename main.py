# main.py
from fasthtml.common import *
from fasthtml.svg import *
from data_models import db, buildings, layout_elements, machine_infos, upload_dir, MachineInfo, LayoutElement # Import db and tables
import json # To parse data sent from JS

# Define SVG components (FastHTML doesn't have these built-in like HTML tags)
# We use ft() to create custom tags
Svg = ft('svg')
Rect = ft('rect')
Line = ft('line')
Circle = ft('circle')
G = ft('g') # Group element
Image = ft('image') # For symbols if using images
TextArea = ft('textarea') # Add TextArea definition


# --- App Setup ---
# Add custom JS for drawing interactions
# Add CSS for styling the tools, canvas, etc.
hdrs = (
    Script(src="/static/drawing.js"), # Our custom JS
    Style("""
        body { margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; }
        #canvas-container { 
            border: 1px solid #ccc; 
            position: relative; 
            overflow: hidden;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-height: 600px;  /* Add minimum height */
            width: 100%;        /* Ensure full width */
        }
        #layout-svg { 
            display: block; 
            background-color: white;
            width: 100%;        /* Ensure full width */
            height: 100%;       /* Ensure full height */
        }
        .toolbox { 
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .toolbox button { 
            margin: 5px;
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
        }
        .toolbox button:hover {
            background: #f0f0f0;
        }
        .toolbox button.uk-button-primary {
            background: #4a90e2;
            color: white;
            border-color: #357abd;
        }
        .toolbox button.uk-button-danger {
            background: #e24a4a;
            color: white;
            border-color: #bd3535;
        }
        #info-panel { 
            background: white;
            border-radius: 8px;
            padding: 15px;
            min-height: 100px;
            margin-top: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .grid {
            display: grid;
            grid-template-columns: 250px 1fr 300px;
            gap: 20px;
            height: calc(100vh - 40px);  /* Full viewport height minus padding */
        }
        h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        hr {
            border: none;
            border-top: 1px solid #eee;
            margin: 15px 0;
        }
        .layout-item {
            cursor: pointer;
        }
        .layout-item:hover {
            filter: brightness(0.95);
        }
        .resize-handle {
            cursor: nw-resize;
        }
        .resize-handle[data-position="n"], .resize-handle[data-position="s"] {
            cursor: ns-resize;
        }
        .resize-handle[data-position="e"], .resize-handle[data-position="w"] {
            cursor: ew-resize;
        }
        .resize-handle[data-position="ne"], .resize-handle[data-position="sw"] {
            cursor: nesw-resize;
        }
        .resize-handle[data-position="nw"], .resize-handle[data-position="se"] {
            cursor: nw-resize;
        }
    """)
)
app, rt = fast_app(hdrs=hdrs,live=True)

# --- Routes ---

@rt("/")
def index(req):
    # Get or create a default building
    current_building = buildings(limit=1)
    if not current_building:
        print("No building found, creating default building")
        current_building = [buildings.insert(name="Default Building")]
    building_id = current_building[0].id
    
    print(f"Using building ID: {building_id}")  # Debug log

    # Placeholder symbols - you'd define these properly
    symbols = {
        'machine_a': {'width': 50, 'height': 50, 'src': '/static/icons/machine_a.svg'},
        'closet_s': {'width': 30, 'height': 30, 'src': '/static/icons/closet.svg'},
    }

    toolbox = Div(cls="toolbox")(
        H3("Tools"),
        Button("Rect", id="tool-rect"),
        Button("Line", id="tool-line"),
        Button("Circle", id="tool-circle"),
        Hr(),
        H3("Symbols"),
        *[Button(f"Place {kind}", data_symbol_kind=kind, data_symbol_src=sym['src'], data_symbol_width=sym['width'], data_symbol_height=sym['height'], cls="tool-symbol")
          for kind, sym in symbols.items()],
        Hr(),
        Button("Select/Move", id="tool-select", cls="uk-button-primary"),
        Hr(),
        Button("Delete Selected", id="delete-selected", cls="uk-button-danger",
               hx_delete="/element/selected",
               hx_target="#layout-svg",
               hx_trigger="click",
               hx_confirm="Are you sure you want to delete the selected element?")
    )

    canvas = Div(id="canvas-container", style="width: 800px; height: 600px;")( # Adjust size as needed
        Svg(id="layout-svg", width="100%", height="100%", data_building_id=building_id,
            xmlns="http://www.w3.org/2000/svg",  # Add SVG namespace
            # Load existing elements via HTMX after page load
            hx_get=f"/layout/{building_id}" if building_id else "",
            hx_trigger="load",
            hx_target="this",
            hx_swap="innerHTML" # Replace content with loaded elements
        )
    )

    info_panel = Div(id="info-panel")(P("Click on a machine/closet to see details."))

    return Titled("Building Layout Manager",
        Grid(
            Div(toolbox, cls="col-2"),
            Div(canvas, cls="col-7"),
            Div(info_panel, cls="col-3")
        ),
        Form(id="upload-form", hx_post="/upload", hx_encoding="multipart/form-data", hx_target="#info-panel", style="display: none;")(
             Input(type="file", name="document"),
             Input(type="hidden", name="element_id", id="upload-element-id"),
             Button("Upload Doc", type="submit")
        )
    )

@rt("/layout/{building_id:int}")
async def get_layout(building_id: int):
    print(f"Loading layout for building {building_id}")  # Debug log
    elements = layout_elements(where="building_id=?", where_args=(building_id,))
    print(f"Found {len(elements)} elements")  # Debug log
    
    svg_elements = []
    for el in elements:
        print(f"Processing element: {el}")  # Debug log
        attrs = {
            'id': f"el-{el.id}",
            'data_element_id': el.id,
            'x': float(el.x),
            'y': float(el.y),
            'stroke': el.stroke,
            'fill': el.fill,
            'class': 'layout-item'
        }
        
        if el.element_type == 'rect':
            svg_elements.append(Rect(**attrs, width=el.width, height=el.height))
        elif el.element_type == 'line':
            svg_elements.append(Line(**attrs, x1=el.x, y1=el.y, x2=el.x2, y2=el.y2))#, fill="none")) # Fill=none for lines
        elif el.element_type == 'circle':
            # SVG uses cx, cy for center
            svg_elements.append(Circle(**attrs, cx=el.x, cy=el.y, r=el.radius))
        elif el.element_type == 'symbol':
            # Using Image tag for symbols
            svg_elements.append(Image(**attrs, href=f"/static/icons/{el.symbol_kind}.svg", width=el.width, height=el.height))
            # Alternatively, use a <G> element with nested shapes if symbols are complex drawings

    print(f"Returning {len(svg_elements)} SVG elements")  # Debug log
    return tuple(svg_elements)

@rt("/element", methods=["POST"])
async def save_element(request: Request):
    # Receives data from JS after drawing/moving/resizing an element
    data = await request.json()
    element_id = data.pop('id', None) # Get ID if updating
    building_id = data.pop('building_id') # Assume JS sends this

    try:
        if element_id: # Update existing element
            # Ensure building_id isn't changed, or handle appropriately
            layout_elements.update(data, element_id)
            return Response(status_code=200)
        else: # Create new element
            new_el = layout_elements.insert(building_id=building_id, **data)
            # Return the new element's ID so JS can update the SVG element
            return Response(json.dumps({'new_id': new_el.id}), media_type='application/json')
    except Exception as e:
        print(f"Error saving element: {e}")
        return Response(status_code=500, content=str(e))

@rt("/element/{element_id:int}", methods=["DELETE"])
async def delete_element(element_id: int):
    try:
        # Note: FK constraint should delete associated MachineInfo
        layout_elements.delete(element_id)
        # Return an empty response, HTMX can remove the element client-side
        return Response(status_code=200, headers={'HX-Trigger': 'elementDeleted'})
    except NotFoundError:
        return Response(status_code=404)
    except Exception as e:
        print(f"Error deleting element: {e}")
        return Response(status_code=500)

@rt("/machine_info/{element_id:int}")
async def get_machine_info(element_id: int):
    # Get info associated with a machine/closet element
    try:
        # Find or create info entry
        info = machine_infos(where="element_id=?", where_args=(element_id,))
        if not info:
            # Create a default entry if none exists
            el = layout_elements[element_id] # Check element exists
            if el.element_type != 'symbol': return P("This element type doesn't store info.")
            info = machine_infos.insert(element_id=element_id, name=f"{el.symbol_kind} {el.id}")
        else:
            info = info[0]

        # Form to edit info
        info_form = Form(hx_post=f"/machine_info/{element_id}", hx_target="#info-panel")(
            H4(f"Info for {info.name}"),
            Label("Name", Input(name="name", value=info.name)),
            Label("Description", TextArea(info.description, name="description")),
            Button("Save Info", type="submit"),
            Hr(),
            H5("Documents"),
            Ul(*[Li(A(doc, href=f"/uploads/{element_id}/{doc}", target="_blank")) for doc in info.documents] if info.documents else [Li("No documents uploaded.")]),
            # Button to trigger hidden file input
            Button("Add Document", type="button", onclick=f"document.getElementById('upload-element-id').value='{element_id}'; document.getElementById('document').click();"),
            # Button to delete the element itself
            Button("Delete Element", type="button", cls="uk-button-danger",
                   hx_delete=f"/element/{element_id}",
                   hx_target=f"#el-{element_id}", # Target the SVG element itself
                   hx_swap="delete", # HTMX extension to remove element
                   hx_confirm="Are you sure you want to delete this element?")
        )
        return info_form

    except NotFoundError:
        return P("Element not found.")
    except Exception as e:
        print(f"Error getting machine info: {e}")
        return P("Error loading information.")

@rt("/machine_info/{element_id:int}", methods=["POST"])
async def update_machine_info(element_id: int, info: MachineInfo): # Use dataclass binding
    # Updates the machine info from the form submission
    try:
        existing_info = machine_infos(where="element_id=?", where_args=(element_id,))[0]
        info.id = existing_info.id # Keep the same ID
        info.element_id = element_id # Ensure element_id is correct
        # Keep existing documents, only name/description are from form
        info.documents = existing_info.documents
        machine_infos.update(info)
        # Return the updated form/info panel content
        return await get_machine_info(element_id)
    except (NotFoundError, IndexError):
        return P("Info record not found.")
    except Exception as e:
        print(f"Error updating machine info: {e}")
        return P("Error saving information.")

@rt("/upload", methods=["POST"])
async def handle_upload(request: Request, element_id: int, document: UploadFile):
    # Handles file uploads for a specific element
    try:
        info_list = machine_infos(where="element_id=?", where_args=(element_id,))
        if not info_list: return Response("Info record not found for element.", status_code=404)
        info = info_list[0]

        # Create element-specific upload directory
        element_upload_dir = upload_dir / str(element_id)
        element_upload_dir.mkdir(exist_ok=True)

        # Save the file
        file_path = element_upload_dir / str(document.filename)
        file_buffer = await document.read()
        file_path.write_bytes(file_buffer)

        # Add filename to the list in the database
        if document.filename not in info.documents:
            info.documents.append(document.filename)
            machine_infos.update(info) # Update the record

        # Return the updated info panel
        return await get_machine_info(element_id)

    except Exception as e:
        print(f"Upload error: {e}")
        # Add a toast message here for better UX
        # from fasthtml.toaster import add_toast
        # setup_toasts(app) # Needs session middleware enabled: fast_app(middleware=Middleware(SessionMiddleware, secret_key="your-secret"))
        # add_toast(session, "Upload failed.", "error") # Need session in handler
        return P(f"Upload failed: {e}") # Simple error feedback

# Serve uploaded files (adjust security as needed for production)
@rt("/uploads/{element_id:int}/{filename:path}")
async def serve_upload(element_id: int, filename: str):
    file_path = upload_dir / str(element_id) / filename
    if file_path.is_file():
        return FileResponse(file_path)
    return Response("File not found", status_code=404)

@rt("/element/selected", methods=["DELETE"])
async def delete_selected_element(request: Request):
    try:
        # Get the selected element ID from the request
        data = await request.json()
        element_id = data.get('element_id')
        if not element_id:
            return Response("No element selected", status_code=400)
        
        # Delete the element
        layout_elements.delete(element_id)
        
        # Return empty response to remove the element from the SVG
        return Response(status_code=200, headers={'HX-Trigger': 'elementDeleted'})
    except Exception as e:
        print(f"Error deleting element: {e}")
        return Response(status_code=500, content=str(e))

# Need a route to create buildings, list them etc. - Omitted for brevity

serve()