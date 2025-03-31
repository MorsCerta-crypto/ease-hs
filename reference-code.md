```python
Html(
    Head(
        Meta(charset='utf-8'),
        Meta(http_equiv='X-UA-Compatible', content='IE=edge'),
        Meta(name='viewport', content='width=device-width, initial-scale=1'),
        Title('HOME ROUGH EDITOR v0.95'),
        Link(rel='stylesheet', href='https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css', integrity='sha384-Zenh87qX5JnK2Jl0vWa8Ck2rdkQ2Bzep5IDxbcnCeuOxjzrPF/et3URy9Bv1WTRi', crossorigin='anonymous'),
        Link(
            Link(rel='stylesheet', href='css/style.css'),
            rel='stylesheet',
            href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css',
            integrity='sha512-xh6O/CkQoPOWDdYTDqeRdPCVd1SpvCA9XXcUnZS2FmJNp1coAFzvtCN9BmamE+4aHK8yyUHUSCcJHgXloTyT2A==',
            crossorigin='anonymous',
            referrerpolicy='no-referrer'
        )
    ),
    Body(
        Header('Make by Home Rough Editor Ver.0.95'),
        Svg(
            Defs(
                Lineargradient(
                    Stop(offset='0%', stop_color='#e65d5e', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#e33b3c', stop_opacity='1'),
                    id='gradientRed',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#FDEB71', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#F8D800', stop_opacity='1'),
                    id='gradientYellow',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#c0f7d9', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#6ce8a3', stop_opacity='1'),
                    id='gradientGreen',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#c4e0f4', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#87c8f7', stop_opacity='1'),
                    id='gradientSky',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#f9ad67', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#f97f00', stop_opacity='1'),
                    id='gradientOrange',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#ffffff', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#f0f0f0', stop_opacity='1'),
                    id='gradientWhite',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#666', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#aaa', stop_opacity='1'),
                    id='gradientGrey',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#4f72a6', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#365987', stop_opacity='1'),
                    id='gradientBlue',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#E2B0FF', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#9F44D3', stop_opacity='1'),
                    id='gradientPurple',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#f6c4dd', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#f699c7', stop_opacity='1'),
                    id='gradientPink',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#3c3b3b', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#000000', stop_opacity='1'),
                    id='gradientBlack',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Lineargradient(
                    Stop(offset='0%', stop_color='#dbc6a0', stop_opacity='1'),
                    Stop(offset='100%', stop_color='#c69d56', stop_opacity='1'),
                    id='gradientNeutral',
                    x1='0%',
                    y1='0%',
                    x2='100%',
                    y2='100%',
                    spreadmethod='pad'
                ),
                Pattern(
                    Image(x='0', y='0', width='256', height='256', **{'xlink:href': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWh5nEP_Trwo96CJjev6lnKe0_dRdA63RJFaoc3-msedgxveJd'}),
                    id='grass',
                    patternunits='userSpaceOnUse',
                    width='256',
                    height='256'
                ),
                Pattern(
                    Image(x='0', y='0', width='256', height='256', **{'xlink:href': 'https://orig00.deviantart.net/e1f2/f/2015/164/8/b/old_oak_planks___seamless_texture_by_rls0812-d8x6htl.jpg'}),
                    id='wood',
                    patternunits='userSpaceOnUse',
                    width='32',
                    height='256'
                ),
                Pattern(
                    Image(x='0', y='0', width='256', height='256', **{'xlink:href': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrkoI2Eiw8ya3J_swhfpZdi_ug2sONsI6TxEd1xN5af3DX9J3R'}),
                    id='tiles',
                    patternunits='userSpaceOnUse',
                    width='25',
                    height='25'
                ),
                Pattern(
                    Image(x='0', y='0', width='256', height='256', **{'xlink:href': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9_nEMhnWVV47lxEn5T_HWxvFwkujFTuw6Ff26dRTl4rDaE8AdEQ'}),
                    id='granite',
                    patternunits='userSpaceOnUse',
                    width='256',
                    height='256'
                ),
                Pattern(
                    Path(d='M 60 0 L 0 0 0 60', fill='none', stroke='#777', stroke_width='0.25'),
                    id='smallGrid',
                    width='60',
                    height='60',
                    patternunits='userSpaceOnUse'
                ),
                Pattern(
                    Rect(width='180', height='180', fill='url(#smallGrid)'),
                    Path(d='M 200 10 L 200 0 L 190 0 M 0 10 L 0 0 L 10 0 M 0 190 L 0 200 L 10 200 M 190 200 L 200 200 L 200 190', fill='none', stroke='#999', stroke_width='0.8'),
                    id='grid',
                    width='180',
                    height='180',
                    patternunits='userSpaceOnUse'
                ),
                Pattern(
                    Path(d='M 0 0 L 0 5 M 10 0 L 10 10 Z', style='stroke:#666;stroke-width:5;'),
                    id='hatch',
                    width='5',
                    height='5',
                    patterntransform='rotate(50 0 0)',
                    patternunits='userSpaceOnUse'
                )
            ),
            G(
                Rect(width='8000', height='5000', x='-3500', y='-2000', fill='url(#grid)'),
                id='boxgrid'
            ),
            G(id='boxpath'),
            G(id='boxSurface'),
            G(id='boxRoom'),
            G(id='boxwall'),
            G(id='boxcarpentry'),
            G(id='boxEnergy'),
            G(id='boxFurniture'),
            G(id='boxbind'),
            G(id='boxArea'),
            G(id='boxRib'),
            G(id='boxScale'),
            G(id='boxText'),
            G(id='boxDebug'),
            id='lin',
            viewbox='0 0 1100 700',
            preserveaspectratio='xMidYMin slice',
            xmlns='http://www.w3.org/2000/svg',
            style='z-index:2;margin:0;padding:0;width:100vw;height:100vh;position:absolute;top:0;left:0;right:0;bottom:0'
        ),
        Div(id='areaValue'),
        Div(
            H2(
                I(aria_hidden='true', cls='fa fa-calculator'),
                'Report plan.'
            ),
            Br(),
            Br(),
            H2(id='reportTotalSurface', style='display:none', cls='toHide'),
            H2(id='reportNumberSurface', style='display:none', cls='toHide'),
            Hr(),
            Section(id='reportRooms', style='display:none', cls='toHide'),
            Button(
                I(aria_hidden='true', cls='fa fa-2x fa-backward'),
                style='margin-top:50px',
                onclick="$('#reportTools').hide('500', function(){$('#panel').show(300);});mode = 'select_mode';",
                cls='btn btn-info fully'
            ),
            id='reportTools',
            style='width:500px;overflow-y: scroll;overflow-x: hidden',
            cls='leftBox'
        ),
        Div(
            H2('Modify the wall', id='titleWallTools'),
            Hr(),
            Section(
                P(
                    'Width [',
                    Span(id='wallWidthScale'),
                    '] :',
                    Span(id='wallWidthVal'),
                    'cm'
                ),
                Input(type='range', id='wallWidth', step='0.1', cls='range'),
                id='rangeThick'
            ),
            Ul(
                Section(
                    P(
                        'Cut the wall :',
                        Br(),
                        Small('A cut will be made at each wall encountered.')
                    ),
                    Li(
                        Button(
                            I(aria_hidden='true', cls='fa fa-2x fa-cutlery'),
                            onclick='editor.splitWall();',
                            cls='btn btn-light shadow fully'
                        )
                    ),
                    id='cutWall'
                ),
                Br(),
                Section(
                    P(
                        'Separation wall :',
                        Br(),
                        Small('Transform the wall into simple separation line.')
                    ),
                    Li(
                        Button(
                            I(aria_hidden='true', cls='fa fa-2x fa-crop'),
                            onclick='editor.invisibleWall();',
                            id='wallInvisible',
                            cls='btn btn-light shadow fully'
                        )
                    ),
                    id='separate'
                ),
                Section(
                    P(
                        'Transform to wall :',
                        Br(),
                        Small('The thickness will be identical to the last known.')
                    ),
                    Li(
                        Button(
                            I(aria_hidden='true', cls='fa fa-2x fa-crop'),
                            onclick='editor.visibleWall();',
                            id='wallVisible',
                            cls='btn btn-light shadow fully'
                        )
                    ),
                    id='recombine'
                ),
                Br(),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-2x fa-trash'),
                        id='wallTrash',
                        cls='btn btn-danger fully'
                    )
                ),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-2x fa-backward'),
                        style='margin-top:50px',
                        onclick="fonc_button('select_mode');$('#boxinfo').html('Selection mode');$('#wallTools').hide('300');$('#panel').show('300');",
                        cls='btn btn-info fully'
                    )
                ),
                cls='list-unstyled'
            ),
            id='wallTools',
            cls='leftBox'
        ),
        Div(
            H2('Modify object'),
            Hr(),
            Section(
                P(
                    'Width [',
                    Span(id='bboxWidthScale'),
                    '] :',
                    Span(id='bboxWidthVal'),
                    'cm'
                ),
                Input(type='range', id='bboxWidth', step='1', cls='range'),
                P(
                    'Length [',
                    Span(id='bboxHeightScale'),
                    '] :',
                    Span(id='bboxHeightVal'),
                    'cm'
                ),
                Input(type='range', id='bboxHeight', step='1', cls='range'),
                id='objBoundingBoxScale'
            ),
            Section(
                P(
                    I(aria_hidden='true', cls='fa fa-compass'),
                    'Rotation :',
                    Span(id='bboxRotationVal'),
                    '°'
                ),
                Input(type='range', id='bboxRotation', step='1', min='-180', max='180', cls='range'),
                id='objBoundingBoxRotation'
            ),
            Div(
                P(
                    Span(
                        'Nb steps [2-15] :',
                        Span('0', id='bboxStepsVal'),
                        id='bboxSteps'
                    )
                ),
                Button(
                    I(aria_hidden='true', cls='fa fa-plus'),
                    id='bboxStepsAdd',
                    cls='btn btn-info'
                ),
                Button(
                    I(aria_hidden='true', cls='fa fa-minus'),
                    id='bboxStepsMinus',
                    cls='btn btn-info'
                ),
                id='stepsCounter',
                style='display:none;'
            ),
            Div(
                Div(data_type='gradientRed', style='color:#f55847;background:linear-gradient(30deg, #f55847, #f00);', cls='color textEditorColor'),
                Div(data_type='gradientYellow', style='color:#e4c06e;background:linear-gradient(30deg,#e4c06e, #ffb000);', cls='color textEditorColor'),
                Div(data_type='gradientGreen', style='color:#88cc6c;background:linear-gradient(30deg,#88cc6c, #60c437);', cls='color textEditorColor'),
                Div(data_type='gradientSky', style='color:#77e1f4;background:linear-gradient(30deg,#77e1f4, #00d9ff);', cls='color textEditorColor'),
                Div(data_type='gradientBlue', style='color:#4f72a6;background:linear-gradient(30deg,#4f72a6, #284d7e);', cls='color textEditorColor'),
                Div(data_type='gradientGrey', style='color:#666666;background:linear-gradient(30deg,#666666, #aaaaaa);', cls='color textEditorColor'),
                Div(data_type='gradientWhite', style='color:#fafafa;background:linear-gradient(30deg,#fafafa, #eaeaea);', cls='color textEditorColor'),
                Div(data_type='gradientOrange', style='color:#f9ad67;background:linear-gradient(30deg, #f9ad67, #f97f00);', cls='color textEditorColor'),
                Div(data_type='gradientPurple', style='color:#a784d9;background:linear-gradient(30deg,#a784d9, #8951da);', cls='color textEditorColor'),
                Div(data_type='gradientPink', style='color:#df67bd;background:linear-gradient(30deg,#df67bd, #e22aae);', cls='color textEditorColor'),
                Div(data_type='gradientBlack', style='color:#3c3b3b;background:linear-gradient(30deg,#3c3b3b, #000000);', cls='color textEditorColor'),
                Div(data_type='gradientNeutral', style='color:#e2c695;background:linear-gradient(30deg,#e2c695, #c69d56);', cls='color textEditorColor'),
                Div(style='clear:both'),
                id='objBoundingBoxColor',
                style='display:none'
            ),
            Br(),
            Br(),
            Button(
                I(aria_hidden='true', cls='fa fa-2x fa-trash'),
                id='bboxTrash',
                cls='btn btn-danger fully'
            ),
            Button(
                I(aria_hidden='true', cls='fa fa-2x fa-backward'),
                style='margin-top:100px',
                onclick="fonc_button('select_mode');$('#boxinfo').html('Selection mode');$('#objBoundingBox').hide(100);$('#panel').show(200);binder.graph.remove();delete binder;",
                cls='btn btn-info'
            ),
            id='objBoundingBox',
            cls='leftBox'
        ),
        Div(
            H2('Modify door/window'),
            Hr(),
            Ul(
                Br(),
                Br(),
                Li(
                    Button('Reverse hinges', id='objToolsHinge', cls='btn btn-light shadow fully')
                ),
                P(
                    'Width [',
                    Span(id='doorWindowWidthScale'),
                    '] :',
                    Span(id='doorWindowWidthVal'),
                    'cm'
                ),
                Input(type='range', id='doorWindowWidth', step='1', cls='range'),
                Br(),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-2x fa-trash'),
                        cls='btn btn-danger fully objTrash'
                    )
                ),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-2x fa-backward'),
                        style='margin-top:100px',
                        onclick="fonc_button('select_mode');$('#boxinfo').html('Selection mode');$('#objTools').hide('100');$('#panel').show('200');binder.graph.remove();delete binder;rib();",
                        cls='btn btn-info'
                    )
                ),
                cls='list-unstyled'
            ),
            id='objTools',
            cls='leftBox'
        ),
        Div(
            Span('Home Rough Editor', style='color:#08d'),
            'estimated a surface of :',
            Br(),
            B(
                Span(cls='size')
            ),
            Br(),
            Br(),
            P('If you have the actual area, you can write it'),
            Div(
                Input(type='text', id='roomSurface', placeholder='surface réelle', aria_describedby='basic-addon2', cls='form-control'),
                Span('m²', id='basic-addon2', cls='input-group-addon'),
                cls='input-group'
            ),
            Br(),
            Input(
                'Wording :',
                Br(),
                Select(
                    Option('None', selected=True, value='0'),
                    Option('Lounge', value='1'),
                    Option('Lunchroom', value='2'),
                    Option('Kitchen', value='3'),
                    Option('Toilet', value='4'),
                    Option('Bathroom', value='5'),
                    Option('Bedroom 1', value='6'),
                    Option('Bedroom 2', value='7'),
                    Option('Bedroom 3', value='8'),
                    Option('Locker', value='9'),
                    Option('Office', value='10'),
                    Option('Hall', value='11'),
                    Option('Loggia', value='12'),
                    Option('Bath 2', value='13'),
                    Option('Toilet 2', value='14'),
                    Option('Bedroom 4', value='15'),
                    Option('Bedroom 5', value='16'),
                    Option('Balcony', value='17'),
                    Option('Terrace', value='18'),
                    Option('Corridor', value='19'),
                    Option('Garage', value='20'),
                    Option('Clearance', value='21'),
                    aria_label='Default select example',
                    id='roomLabel',
                    cls='form-select'
                ),
                Br(),
                Br(),
                'Meter :',
                Div(
                    Div(
                        Input(type='checkbox', name='roomShow', value='showSurface', id='seeArea', checked=True),
                        Label('Show the surface', fr='seeArea'),
                        cls='funkyradio-success'
                    ),
                    cls='funkyradio'
                ),
                Div(
                    Div(
                        Input(type='radio', name='roomAction', id='addAction', value='add', checked=True),
                        Label('Add the surface', fr='addAction'),
                        cls='funkyradio-success'
                    ),
                    Div(
                        Input(type='radio', name='roomAction', id='passAction', value='pass'),
                        Label('Ignore the surface', fr='passAction'),
                        cls='funkyradio-warning'
                    ),
                    cls='funkyradio'
                ),
                Hr(),
                P('Colors'),
                Div(data_type='gradientRed', style='background:linear-gradient(30deg, #f55847, #f00);', cls='roomColor'),
                Div(data_type='gradientYellow', style='background:linear-gradient(30deg,#e4c06e, #ffb000);', cls='roomColor'),
                Div(data_type='gradientGreen', style='background:linear-gradient(30deg,#88cc6c, #60c437);', cls='roomColor'),
                Div(data_type='gradientSky', style='background:linear-gradient(30deg,#77e1f4, #00d9ff);', cls='roomColor'),
                Div(data_type='gradientBlue', style='background:linear-gradient(30deg,#4f72a6, #284d7e);', cls='roomColor'),
                Div(data_type='gradientGrey', style='background:linear-gradient(30deg,#666666, #aaaaaa);', cls='roomColor'),
                Div(data_type='gradientWhite', style='background:linear-gradient(30deg,#fafafa, #eaeaea);', cls='roomColor'),
                Div(data_type='gradientOrange', style='background:linear-gradient(30deg, #f9ad67, #f97f00);', cls='roomColor'),
                Div(data_type='gradientPurple', style='background:linear-gradient(30deg,#a784d9, #8951da);', cls='roomColor'),
                Div(data_type='gradientPink', style='background:linear-gradient(30deg,#df67bd, #e22aae);', cls='roomColor'),
                Div(data_type='gradientBlack', style='background:linear-gradient(30deg,#3c3b3b, #000000);', cls='roomColor'),
                Div(data_type='gradientNeutral', style='background:linear-gradient(30deg,#e2c695, #c69d56);', cls='roomColor'),
                Br(),
                Br(),
                P('Matérials'),
                Div(data_type='wood', style="background: url('https://orig00.deviantart.net/e1f2/f/2015/164/8/b/old_oak_planks___seamless_texture_by_rls0812-d8x6htl.jpg');", cls='roomColor'),
                Div(data_type='tiles', style="background: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrkoI2Eiw8ya3J_swhfpZdi_ug2sONsI6TxEd1xN5af3DX9J3R');", cls='roomColor'),
                Div(data_type='granite', style="background: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9_nEMhnWVV47lxEn5T_HWxvFwkujFTuw6Ff26dRTl4rDaE8AdEQ');", cls='roomColor'),
                Div(data_type='grass', style="background: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWh5nEP_Trwo96CJjev6lnKe0_dRdA63RJFaoc3-msedgxveJd');", cls='roomColor'),
                Div(data_type='#ff008a', style='clear:both'),
                Br(),
                Br(),
                Input(type='hidden', id='roomBackground', value='gradientNeutral'),
                Input(type='hidden', id='roomIndex', value=True),
                Button('Apply', type='button', id='applySurface', cls='btn btn-primary'),
                Button('Cancel', type='button', id='resetRoomTools', cls='btn btn-danger'),
                Br(),
                type='hidden',
                id='roomName',
                value=True
            ),
            id='roomTools',
            cls='leftBox'
        ),
        Div(
            Ul(
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-chevron-circle-left'),
                        Button(
                            I(aria_hidden='true', cls='fa fa-chevron-circle-right'),
                            id='redo',
                            title='redo',
                            cls='btn disabled halfy pull-right'
                        ),
                        id='undo',
                        title='undo',
                        cls='btn disabled halfy'
                    )
                ),
                Br(),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-2x fa-mouse-pointer'),
                        id='select_mode',
                        style='box-shadow:2px 2px 3px #ccc;',
                        cls='btn btn-success fully'
                    )
                ),
                Br(),
                Li(
                    Button('WALL', style='margin-bottom:0px', id='line_mode', data_toggle='tooltip', data_placement='right', title='Make walls', cls='btn btn-light shadow fully'),
                    Button('PARTITION', style='margin-bottom:0px', id='partition_mode', data_toggle='tooltip', data_placement='right', title='Make partitions wall', cls='mt-2 btn btn-light shadow fully'),
                    Div(
                        Div(
                            Input(type='checkbox', id='multi', checked=True),
                            Label('MULTIPLE', fr='multi'),
                            cls='funkyradio-success'
                        ),
                        style='font-size:0.8em',
                        cls='funkyradio'
                    )
                ),
                Br(),
                Li(
                    Button('CONFIG. ROOMS', id='room_mode', cls='btn btn-light shadow fully')
                ),
                Br(),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-2x fa-scissors'),
                        id='node_mode',
                        cls='btn btn-light shadow fully'
                    )
                ),
                Br(),
                Li(
                    Button('MEASURE', id='distance_mode', data_toggle='tooltip', data_placement='right', title='Add a measurement', cls='btn btn-light shadow fully')
                ),
                Li(
                    Button('TEXT', id='text_mode', data_toggle='tooltip', data_placement='right', title='Add text', cls='btn btn-light shadow fully')
                ),
                Br(),
                Div(
                    Button('Aperture', id='aperture', cls='btn fully door'),
                    Button('Simple', id='simple', cls='btn fully door'),
                    Button('Double', id='double', cls='btn fully door'),
                    Button('Pocket', id='pocket', cls='btn fully door'),
                    id='door_list',
                    style='box-shadow:2px 2px 3px #ccc;display:none;background:#fff;border-radius: 0 5px 5px 0; padding:10px;position:absolute;left:200px;width:150px',
                    cls='list-unstyled sub'
                ),
                Li(
                    Button('DOOR', id='door_mode', onclick="$('.sub').hide();$('#door_list').toggle(200);$('#window_list').hide();", cls='btn btn-light shadow fully')
                ),
                Div(
                    Button('Fix', id='fix', cls='btn fully window'),
                    Button('Simple', id='flap', cls='btn fully window'),
                    Button('Double', id='twin', cls='btn fully window'),
                    Button('Slide', id='bay', cls='btn fully window'),
                    id='window_list',
                    style='box-shadow:2px 2px 3px #ccc;display:none;background:#fff;border-radius: 0 5px 5px 0; padding:10px;position:absolute;left:200px;width:150px',
                    cls='list-unstyled sub'
                ),
                Li(
                    Button('WINDOW', id='window_mode', onclick="$('.sub').hide();$('#window_list').toggle(200);$('#door_list').hide()", cls='btn btn-light shadow fully')
                ),
                Li(
                    Button('STAIR', id='stair_mode', onclick="$('.sub').hide();$('#door_list').hide()", cls='btn btn-light shadow fully object')
                ),
                Br(),
                Div(
                    Div(
                        P('Energy'),
                        Div(
                            P('High current'),
                            Div(
                                Button('Switchboard', id='gtl', cls='btn btn-light fully object'),
                                Button('Switch', id='switch', cls='btn btn-light fully object'),
                                Button('Multiways', id='doubleSwitch', cls='btn btn-light fully object'),
                                Button('Variator', id='dimmer', cls='btn btn-light fully object'),
                                style='width:120px;float:left;padding:2px'
                            ),
                            Div(
                                Button('Electrical outlet', id='plug', cls='btn btn-light fully object'),
                                Button('Outlet 20A', id='plug20', cls='btn btn-light fully object'),
                                Button('Outlet 32A', id='plug32', cls='btn btn-light fully object'),
                                Button('Ceiling lamp', id='rooflight shadow', cls='btn btn-light fully object'),
                                Button('Wall light', id='walllight shadow', cls='btn btn-light fully object'),
                                style='width:120px;float:left;padding:2px'
                            ),
                            style='float:left;padding:10px;margin:5px;border:1px solid #ddd;border-radius:5px'
                        ),
                        Div(
                            P('Low current'),
                            Button('Internet access', id='www', cls='btn btn-light fully object'),
                            Button('RJ45 plug', id='rj45', cls='btn btn-light fully object'),
                            Button('Antenna plug', id='tv', cls='btn btn-light fully object'),
                            style='width:130px;float:left;padding:10px;margin:5px;border:1px solid #ddd;border-radius:5px'
                        ),
                        Div(
                            P('Thermal'),
                            Button('Boiler', id='boiler', cls='btn btn-light fully object'),
                            Button('Water heater', id='heater', cls='btn btn-light fully object'),
                            Button('Radiator', id='radiator', cls='btn btn-light fully object'),
                            style='width:130px;float:left;padding:10px;margin:5px;border:1px solid #ddd;border-radius:5px'
                        ),
                        style='width:600px;float:left;padding:10px'
                    ),
                    id='energy_list',
                    style='box-shadow:2px 2px 3px #ccc;display:none;background:#fff;border-radius: 0 5px 5px 0; padding:10px;position:absolute;left:200px;bottom:40px;width:600px',
                    cls='list-unstyled sub'
                ),
                Li(
                    Button('ENERGY', id='object_mode', onclick="$('.sub').hide();$('#energy_list').toggle(200);", cls='btn btn-light shadow fully')
                ),
                Br(),
                Li(
                    Button('Layers', id='layer_mode', onclick="$('.sub').hide();$('#layer_list').toggle(200);", cls='btn btn-light shadow fully')
                ),
                Div(
                    Div(
                        Div(
                            Input(type='checkbox', id='showRib', checked=True),
                            Label('Measurement', fr='showRib'),
                            cls='funkyradio-info'
                        ),
                        style='font-size:0.8em',
                        cls='funkyradio'
                    ),
                    Div(
                        Div(
                            Input(type='checkbox', id='showArea', checked=True),
                            Label('Surface', fr='showArea'),
                            cls='funkyradio-info'
                        ),
                        style='font-size:0.8em',
                        cls='funkyradio'
                    ),
                    Div(
                        Div(
                            Input(type='checkbox', id='showLayerRoom', checked=True),
                            Label('Texture', fr='showLayerRoom'),
                            cls='funkyradio-info'
                        ),
                        style='font-size:0.8em',
                        cls='funkyradio'
                    ),
                    Div(
                        Div(
                            Input(type='checkbox', id='showLayerEnergy', checked=True),
                            Label('Energy', fr='showLayerEnergy'),
                            cls='funkyradio-info'
                        ),
                        style='font-size:0.8em',
                        cls='funkyradio'
                    ),
                    id='layer_list',
                    style='box-shadow:2px 2px 3px #ccc;display:none;background:#fff;border-radius: 0 5px 5px 0; padding:10px;position:absolute;left:200px;bottom:100px;width:200px',
                    cls='list-unstyled sub'
                ),
                Li(
                    Button(
                        I(aria_hidden='true', cls='fa fa-calculator'),
                        Button(
                            I(aria_hidden='true', cls='fa fa-expand'),
                            onclick="fullscreen();this.style.display='none';$('#nofull_mode').show();",
                            id='full_mode',
                            title='Full screen',
                            cls='btn btn-light shadow halfy pull-right'
                        ),
                        Button(
                            I(aria_hidden='true', cls='fa fa-compress'),
                            style='display:none',
                            onclick="outFullscreen();this.style.display='none';$('#full_mode').show();",
                            id='nofull_mode',
                            data_toggle='tooltip',
                            data_placement='right',
                            title='Full screen',
                            cls='btn btn-light shadow halfy pull-right'
                        ),
                        Li(
                            Div(style='clear:both')
                        ),
                        id='report_mode',
                        title='Show report',
                        cls='btn btn-light shadow halfy'
                    )
                ),
                cls='list-unstyled'
            ),
            id='panel',
            cls='leftBox'
        ),
        Div(
            Div(
                Div(
                    Div(
                        H4('Welcome Home Rough Editor v0.95', id='myModalLabel', cls='modal-title'),
                        cls='modal-header'
                    ),
                    Div(
                        Div(
                            P('A plan exists in historical, would you like recover him ?'),
                            Button('YES', data_bs_dismiss='modal', onclick="initHistory('recovery');", cls='btn btn-success shadow'),
                            Hr(),
                            P('Or are you prefer start a new plan ?'),
                            id='recover'
                        ),
                        Div(
                            Div(
                                Img(src='img/newPlanEmpty.jpg', onclick='initHistory();', data_bs_dismiss='modal', cls='img-fluid'),
                                cls='boxMouseOver'
                            ),
                            Div(
                                Img(src='img/newPlanSquare.jpg', onclick="initHistory('newSquare');", data_bs_dismiss='modal', cls='img-fluid'),
                                cls='boxMouseOver'
                            ),
                            Div(
                                Img(src='img/newPlanL.jpg', onclick="initHistory('newL');", data_bs_dismiss='modal', cls='img-fluid'),
                                cls='boxMouseOver'
                            ),
                            cls='w-100 d-flex justify-content-center flex-column gap-4 flex-md-row'
                        ),
                        cls='modal-body m-2'
                    ),
                    cls='modal-content'
                ),
                role='document',
                cls='modal-dialog modal-lg modal-dialog-centered'
            ),
            id='myModal',
            tabindex='-1',
            role='dialog',
            aria_labelledby='myModalLabel',
            cls='modal fade'
        ),
        Div(
            Div(
                Div(
                    Div(
                        Button(
                            Span('×', aria_hidden='true'),
                            type='button',
                            data_bs_dismiss='modal',
                            aria_label='Close',
                            cls='btn-close'
                        ),
                        H4('Text editor', id='textToLayerLabel', cls='modal-title'),
                        cls='modal-header'
                    ),
                    Div(
                        P('Choose police color'),
                        Div(data_type='gradientRed', style='color:#f55847;background:linear-gradient(30deg, #f55847, #f00);', cls='color textEditorColor'),
                        Div(data_type='gradientYellow', style='color:#e4c06e;background:linear-gradient(30deg,#e4c06e, #ffb000);', cls='color textEditorColor'),
                        Div(data_type='gradientGreen', style='color:#88cc6c;background:linear-gradient(30deg,#88cc6c, #60c437);', cls='color textEditorColor'),
                        Div(data_type='gradientSky', style='color:#77e1f4;background:linear-gradient(30deg,#77e1f4, #00d9ff);', cls='color textEditorColor'),
                        Div(data_type='gradientBlue', style='color:#4f72a6;background:linear-gradient(30deg,#4f72a6, #284d7e);', cls='color textEditorColor'),
                        Div(data_type='gradientGrey', style='color:#666666;background:linear-gradient(30deg,#666666, #aaaaaa);', cls='color textEditorColor'),
                        Div(data_type='gradientWhite', style='color:#fafafa;background:linear-gradient(30deg,#fafafa, #eaeaea);', cls='color textEditorColor'),
                        Div(data_type='gradientOrange', style='color:#f9ad67;background:linear-gradient(30deg, #f9ad67, #f97f00);', cls='color textEditorColor'),
                        Div(data_type='gradientPurple', style='color:#a784d9;background:linear-gradient(30deg,#a784d9, #8951da);', cls='color textEditorColor'),
                        Div(data_type='gradientPink', style='color:#df67bd;background:linear-gradient(30deg,#df67bd, #e22aae);', cls='color textEditorColor'),
                        Div(data_type='gradientBlack', style='color:#3c3b3b;background:linear-gradient(30deg,#3c3b3b, #000000);', cls='color textEditorColor'),
                        Div(data_type='gradientNeutral', style='color:#e2c695;background:linear-gradient(30deg,#e2c695, #c69d56);', cls='color textEditorColor'),
                        Div(style='clear:both'),
                        Hr(),
                        P('Police size'),
                        Input(type='range', list='tickmarks', id='sizePolice', step='0.1', min='10', max='30', value='15', style='width:200px', cls='range'),
                        Hr(),
                        P('Your text', contenteditable='true', id='labelBox', onfocus="this.innerHTML='';", style='font-size:15px;padding:5px;border-radius:5px;color:#333'),
                        cls='modal-body'
                    ),
                    Div(
                        Button('Cancel', type='button', data_bs_dismiss='modal', cls='btn btn-light shadow'),
                        Button('Apply', type='button', onclick="$('#textToLayer').modal('hide');", cls='btn btn-primary'),
                        cls='modal-footer'
                    ),
                    cls='modal-content'
                ),
                role='document',
                cls='modal-dialog'
            ),
            id='textToLayer',
            tabindex='-1',
            role='dialog',
            aria_labelledby='textToLayerLabel',
            cls='modal fade'
        ),
        Div(style='position:absolute;bottom:10px;left:210px;font-size:1.5em;color:#08d', id='boxinfo'),
        Div(
            P(
                Img(src='https://cdn4.iconfinder.com/data/icons/mathematics-doodle-3/48/102-128.png', width='20px'),
                'Home Rough\n      Editor',
                style='margin:0px 0 0 0;font-size:11px',
                onclick="document.location='https://github.com/ekymoz/homeRoughEditor'"
            ),
            Div(
                P(
                    Button(
                        I(aria_hidden='true', cls='fa fa-arrow-up'),
                        data_zoom='zoomtop',
                        style='box-shadow:2px 2px 3px #ccc;',
                        cls='btn btn-xs btn-info zoom'
                    ),
                    style='margin:0'
                ),
                P(
                    Button(
                        I(aria_hidden='true', cls='fa fa-arrow-left'),
                        data_zoom='zoomleft',
                        style='box-shadow:2px 2px 3px #ccc;',
                        cls='btn btn-xs btn-info zoom'
                    ),
                    Button(
                        I(aria_hidden='true', cls='fa fa-bullseye'),
                        data_zoom='zoomreset',
                        style='box-shadow:2px 2px 3px #ccc;',
                        cls='btn btn-xs btn-light shadow zoom'
                    ),
                    Button(
                        I(aria_hidden='true', cls='fa fa-arrow-right'),
                        data_zoom='zoomright',
                        style='box-shadow:2px 2px 3px #ccc;',
                        cls='btn btn-xs btn-info zoom'
                    ),
                    style='margin:0'
                ),
                P(
                    Button(
                        I(aria_hidden='true', cls='fa fa-arrow-down'),
                        data_zoom='zoombottom',
                        style='box-shadow:2px 2px 3px #ccc;',
                        cls='btn btn-xs btn-info zoom'
                    ),
                    style='margin:0'
                ),
                style='margin:10px',
                cls='pull-right'
            ),
            id='moveBox',
            style='position:absolute;right:-150px;top:10px;color:#08d;background:transparent;z-index:2;text-align:center;transition-duration: 0.2s;transition-timing-function: ease-in;'
        ),
        Div(
            Div(
                Button(
                    I(aria_hidden='true', cls='fa fa-plus'),
                    data_zoom='zoomin',
                    style='box-shadow:2px 2px 3px #ccc;',
                    cls='btn btn btn-light shadow zoom'
                ),
                Button(
                    I(aria_hidden='true', cls='fa fa-minus'),
                    data_zoom='zoomout',
                    style='box-shadow:2px 2px 3px #ccc;',
                    cls='btn btn btn-light shadow zoom'
                ),
                style='margin-right:10px',
                cls='pull-right'
            ),
            Div(style='clear:both'),
            Div('1m', id='scaleVal', style='box-shadow:2px 2px 3px #ccc;width:60px;height:20px;background:#4b79aa;border-radius:4px;margin-right:10px', cls='pull-right'),
            Div(style='clear:both'),
            id='zoomBox',
            style='position:absolute;z-index:100;right:-150px;bottom:20px;text-align:center;background:transparent;padding:0px;color:#fff;transition-duration: 0.2s;transition-timing-function: ease-in;'
        ),
        style='background:#f2eee5;margin:0;padding:0; '
    ),
    Script(src='https://code.jquery.com/jquery-3.6.1.slim.min.js', integrity='sha256-w8CvhFs7iHNVUtnSP0YKEg00p9Ih13rlL9zGqvLdePA=', crossorigin='anonymous'),
    Script(src='https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.min.js', integrity='sha384-IDwe1+LCz02ROU9k972gdyvl+AESN10+x7tBKgc9I5HFtuNz0wWnPclzo6p9vxnk', crossorigin='anonymous'),
    Script(src='mousewheel.js'),
    Script(src='func.js'),
    Script(src='qSVG.js'),
    Script(src='editor.js'),
    Script(src='engine.js'),
    lang='en'
)
```