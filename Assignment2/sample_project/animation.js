 // *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// no meaningful scenes to draw - you will fill it in (at the bottom of the file) with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes you see drawn are coded, and where to fill in your own code.

"use strict"      // Selects strict javascript
var canvas, canvas_size, shaders, gl = null, g_addrs,          // Global variables
	thrust = vec3(), 	origin = vec3( 0, 10, -15 ), looking = false, prev_time = 0, animate = false, animation_time = 0, gouraud = false, color_normals = false, after_random =false, after_random2 = false;

// *******************************************************
// IMPORTANT -- Any new variables you define in the shader programs need to be in the list below, so their GPU addresses get retrieved.

var shader_variable_names = [ "camera_transform", "camera_model_transform", "projection_camera_model_transform", "camera_model_transform_normal",
                              "shapeColor", "lightColor", "lightPosition", "attenuation_factor", "ambient", "diffusivity", "shininess", "smoothness", 
                              "animation_time", "COLOR_NORMALS", "GOURAUD", "USE_TEXTURE" ];
   
function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     // Colors are just special vec4s expressed as: ( red, green, blue, opacity )
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( Color( .8,.3,.8,1 ), .1, 1, 1, 40, undefined ) ); }

// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "pic.jpg" ];

window.onload = function init() {	var anim = new Animation();	}   // Our whole program's entry point

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- 
// which OpenGL is told to call upon every time a draw / keyboard / mouse event happens.
function Animation()    // A class.  An example of a displayable object that our class GL_Context can manage.
{
	( function init( self )
	{
		self.context = new GL_Context( "gl-canvas", Color( 0,0,0,1 ) );    // Set your background color here -skycolor (red, green,blue)
		self.context.register_display_object( self );
		
    shaders = { "Default":     new Shader( "vertex-shader-id", "fragment-shader-id" ), 
                "Demo_Shader": new Shader( "vertex-shader-id", "demo-shader-id"     )  };
    
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
    self.mouse = { "from_center": vec2() };
		            
    self.m_strip       = new Old_Square();                // At the beginning of our program, instantiate all shapes we plan to use, 
		self.m_tip         = new Tip( 3, 10 );                // each with only one instance in the graphics card's memory.
    self.m_cylinder    = new Cylindrical_Tube( 10, 10 );  // For example we'll only create one "cube" blueprint in the GPU, but we'll re-use 
    self.m_torus       = new Torus( 25, 25 );             // it many times per call to display to get multiple cubes in the scene.
    self.m_sphere      = new Sphere( 20, 20 );
    self.poly          = new N_Polygon( 7 );
    self.m_cone        = new Cone( 10, 10 );
    self.m_capped      = new Capped_Cylinder( 4, 12 );
    self.m_prism       = new Prism( 8, 8 );
    self.m_cube        = new Cube();
    self.m_obj         = new Shape_From_File( "teapot.obj", scale( .1, .1, .1 ) );
    self.m_scarf       = new Shape_From_File( "scarf.obj", scale( 15, 15, 15 ) );
    self.m_sub         = new Subdivision_Sphere( 4, false );
    self.m_axis        = new Axis();

    self.m_triangle = new Triangle();
    self.m_windmill = new Windmill(4);
    self.m_tetrahedron = new Tetrahedron(false);
    self.m_tri = new Tri();
    self.m_water = new Waterdrop(40,40);
    self.m_head = new Hemisphere( 20, 20 );
    self.m_text = new Text_Line(50);
    // self.m_hex = new Hex(false);
		
// 1st parameter is our starting camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, -120, -500), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );
		
		self.context.render();	
	} ) ( this );
	
// *** Mouse controls: ***
  var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.     
  canvas.addEventListener("mouseup",   ( function(self) { return function(e)	{ e = e || window.event;		self.mouse.anchor = undefined;              } } ) (this), false );
  canvas.addEventListener("mousedown", ( function(self) { return function(e)  { e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
  canvas.addEventListener("mousemove", ( function(self) { return function(e)  { e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );                                         
  canvas.addEventListener("mouseout", ( function(self) { return function(e)	{ self.mouse.from_center = vec2(); }; } ) (this), false );        // Stop steering if the mouse leaves the canvas. 
}
  
// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
	shortcut.add( ".",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
  shortcut.add( "o",   ( function(self) { return function() { origin = vec3( mult_vec( inverse( self.graphicsState.camera_transform ), vec4(0,0,0,1) )                       ); } } ) (this) ) ;
	shortcut.add( "r",   ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud; } );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; }; } ) (this) );	
}

Animation.prototype.update_strings = function( debug_screen_strings )	      // Strings that this displayable object (Animation) contributes to the UI:	
{
	debug_screen_strings.string_map["time"]    = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
  debug_screen_strings.string_map["fps"]    = "FPS: " + (1/(this.animation_delta_time/1000));
	debug_screen_strings.string_map["basis"]   = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"]  = "Thrust: " + thrust;
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70,  degrees_per_frame = .0004 * animation_delta_time,
                      meters_per_frame  =   .01 * animation_delta_time;
										
    if( self.mouse.anchor ) // Dragging mode: Is a mouse drag occurring?
    {
      var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
      if( length( dragging_vector ) > 0 )
        self.graphicsState.camera_transform = mult( self.graphicsState.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
            mult( translation(origin),                                                      
            mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ), 
            translation(scale_vec( -1,origin ) ) ) ) );
    }    
          // Flyaround mode:  Determine camera rotation movement first
		var movement_plus  = [ self.mouse.from_center[0] + leeway, self.mouse.from_center[1] + leeway ];  // mouse_from_center[] is mouse position relative to canvas center;
		var movement_minus = [ self.mouse.from_center[0] - leeway, self.mouse.from_center[1] - leeway ];  // leeway is a tolerance from the center before it starts moving.
		
		for( var i = 0; looking && i < 2; i++ )			// Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// A short function for testing.  It draws a lot of things at once.  See display() for a more basic look at how to draw one thing at a time.
Animation.prototype.test_lots_of_shapes = function( model_transform )
  {
    var shapes = [ this.m_prism, this.m_capped, this.m_cone, this.m_sub, this.m_sphere, this.m_obj, this.m_torus ];   // Randomly include some shapes in a list
    var tex_names = [ undefined, "stars.png", "earth.gif", "pic.jpg" ]
    
    for( var i = 3; i < shapes.length + 3; i++ )      // Iterate through that list
    {
      var spiral_transform = model_transform, funny_number = this.graphicsState.animation_time/20 + (i*i)*Math.cos( this.graphicsState.animation_time/2000 );
      spiral_transform = mult( spiral_transform, rotation( funny_number, i%3 == 0, i%3 == 1, i%3 == 2 ) );    
      for( var j = 1; j < 4; j++ )                                                                                  // Draw each shape 4 times, in different places
      {
        var mat = new Material( Color( i % j / 5, j % i / 5, i*j/25, 1 ), .3,  1,  1, 40, tex_names[ (i*j) % tex_names.length ] )       // Use a random material
        // The draw call:
        shapes[i-3].draw( this.graphicsState, spiral_transform, mat );			                        //  Draw the current shape in the list, passing in the current matrices		
        spiral_transform = mult( spiral_transform, rotation( 63, 3, 5, 7 ) );                       //  Move a little bit before drawing the next one
        spiral_transform = mult( spiral_transform, translation( 0, 5, 0) );
      } 
      model_transform = mult( model_transform, translation( 0, -3, 0 ) );
    }
    return model_transform;     
  }
    
// *******************************************************	
// display(): Called once per frame, whenever OpenGL decides it's time to redraw.

var convertColor = function(v1, v2, v3, v4) {
  return vec4(v1/255, v2/255, v3/255, v4);
}

var seed = 1;
function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
var purplePlastic = new Material( Color( .9,.5,.9,1 ), .01, .2, .4, 40 ), // Omit the final (string) parameter if you want no texture
      greyPlastic = new Material( Color( .5,.5,.5,1 ), .01, .4, .2, 20 ),
            earth = new Material( Color( .5,.5,.5,1 ), .1,  1, .5, 40, "earth.gif" ),
            stars = new Material( Color( .5,.5,.5,1 ), .1,  1,  1, 40, "stars.png" ),
            brick = new Material( Color( .5,.5,.5,1 ), .1,  1,  1, 40, "pic.jpg" ),
              red = new Material( Color( .9, 0, 0,1 ), .1,  1,  1, 40),
            white = new Material( vec4( 0.8, 0.8, 0.8, 1 ), 0.5, 1.0, 0.0, 40 ),
           yellow = new Material( vec4( 0.9, 0.9, 0.3, 1 ), 0.5, 1.0, 0.0, 40 ),
            black = new Material( vec4( 0.0, 0.0, 0.0, 1 ), 0.5, 0.0, 1.0, 20 ),
            grey = new Material( vec4( 0.0, 0.0, 0.0, 0.8 ), 0.5, 0.0, 1.0, 20 ),
             tree = new Material( vec4( 0.0, 0.5, 0.4, 1 ), .0, 1.0, 0.0, 40 ),
            water = new Material( convertColor(173, 235, 235, 1), .0, 1.0, 0.0, 40 ),
         mushroom = new Material( convertColor(191, 63, 127, 1), .0, 1.0, 0.0, 40 );

var trees = [];
var mushrooms = [];
var clouds = [];
var camPos = [];


//draw person
Animation.prototype.drawPerson = function(model_transform) {

    var moving_rate = Math.sin(this.graphicsState.animation_time/1200);
    var water = new Material( convertColor(173, 235, 235, 1), .0, 1.0, 0.0, 40 );
    var new_model_transform = model_transform; 
    var new_stack = []; 

    // //head
    new_model_transform = mult( new_model_transform, rotation( 90, -1, 0, 0 ) );
    this.m_water.draw( this.graphicsState, new_model_transform, water);
    new_model_transform = mult( new_model_transform, rotation( 90, 1, 0, 0 ) );

    //body
    new_model_transform = mult( new_model_transform, translation( 0, -4.8, 0 ) );
    new_model_transform = mult( new_model_transform, scale( 1.2, 1.8, 1.2 ) );
    this.m_sub.draw( this.graphicsState, new_model_transform, water);
    new_model_transform = mult( new_model_transform, scale( 1/1.2, 1/1.8, 1/1.2 ) );
    new_model_transform = mult( new_model_transform, translation( 0, 4.8, 0 ) );

    //scarf
    new_stack.push(new_model_transform);
    new_model_transform = this.drawScarf(new_model_transform); 
    new_model_transform = new_stack.pop(); 
}

//draw scarf
Animation.prototype.drawScarf = function(model_transform) {
    var moving_rate = Math.sin(this.graphicsState.animation_time/1200);
    var water = new Material( convertColor(173, 235, 235, 1), .0, 1.0, 0.0, 40 ),
    red = new Material( Color( .9, 0, 0,1 ), .1,  1,  1, 40);
    var new_model_transform = model_transform; 
    var new_stack = []; 

    //scarf
    new_model_transform = mult( new_model_transform, translation( 0, -4.8, 0 ) );
    new_model_transform = mult( new_model_transform, translation( 0, 2, 0 ) );
    new_model_transform = mult( new_model_transform, rotation( 60+10*moving_rate, 0, 0, 1 ) );
    new_model_transform = mult( new_model_transform, translation( 0, -2, 0 ) );
    new_model_transform = mult( new_model_transform, scale( 1, 2, 1 ) );
    new_model_transform = mult( new_model_transform, rotation( 120, 0, 1, 0 ) );
    this.m_tetrahedron.draw( this.graphicsState, new_model_transform, water);

    //second part
    new_model_transform = mult( new_model_transform, rotation( 90, 1, 0, 0 ) );
    new_model_transform = mult( new_model_transform, rotation( 10*moving_rate, 1, 0, 0 ) );
    this.m_tetrahedron.draw( this.graphicsState, new_model_transform, water);
}

//draw butterfly
Animation.prototype.drawButterfly = function(model_transform){
    var moving_rate = Math.sin(this.graphicsState.animation_time/200);

    model_transform = mult( model_transform, translation( 3, 3, 0 ) );
    // model_transform = mult( model_transform, rotation( 180, -1, 0, 0 ) );
    model_transform = mult( model_transform, rotation( 60, 0, 0, -1 ) );
    //model_transform = mult( model_transform, translation( 0, -1, 0 ) );
    model_transform = mult( model_transform, rotation( 30*moving_rate, 0, 1, 0 ) );
    this.m_tri.draw( this.graphicsState, model_transform, black);
    model_transform = mult( model_transform, rotation( 180, 0, 1, 0 ) );
    model_transform = mult( model_transform, rotation( 60*moving_rate, 0, -1, 0 ) );
    this.m_tri.draw( this.graphicsState, model_transform, grey);
}

//draw mushroom
Animation.prototype.drawMushroom = function(model_transform) {
    var new_model_transform = model_transform; 

    //head
    new_model_transform = mult( new_model_transform, translation( 0, -10, 0 ) );
    new_model_transform = mult( new_model_transform, rotation( 90, 1, 0, 0 ) );
    new_model_transform = mult( new_model_transform, scale( 0.5, 0.5, 1.5 ) );
    this.m_prism.draw( this.graphicsState, new_model_transform, mushroom);
    new_model_transform = mult( new_model_transform, scale( 2, 2, 0.5 ) );
    new_model_transform = mult( new_model_transform, rotation( 90, -1, 0, 0 ) );

    new_model_transform = mult( new_model_transform, translation( 0, 1, 0 ) );
    new_model_transform = mult( new_model_transform, scale( 1.2, 1.2, 1.2 ) );
    this.m_head.draw( this.graphicsState, new_model_transform, mushroom);
}

//draw tree
Animation.prototype.drawTree = function(model_transform) {
    var moving_rate = Math.sin(this.graphicsState.animation_time/1200);
    //var tree = new Material( vec4( 0.0, 0.5, 0.4, 1 ), .0, 1.0, 0.0, 40 );
    var new_model_transform = model_transform; 
    var new_stack = []; 

    //head
    new_model_transform = mult( new_model_transform, rotation( 90, -1, 0, 0 ) );
    new_model_transform = mult( new_model_transform, scale( 2.5, 2.5, 2.5 ) );
    this.m_tip.draw( this.graphicsState, new_model_transform, tree);

    //body
    new_model_transform = mult( new_model_transform, translation( 0, 0, -2 ) );
    new_model_transform = mult( new_model_transform, scale( 1.2, 1.2, 1.8 ) );
    this.m_tip.draw( this.graphicsState, new_model_transform, tree);
    new_model_transform = mult( new_model_transform, scale( 1/1.2, 1/1.2, 1/1.8 ) );
}

//draw clouds
Animation.prototype.drawClouds = function(model_transform){
    model_transform = mult(model_transform, translation(0, -35 ,0));
    model_transform = mult(model_transform, scale(30, 20,30));
    this.m_sub.draw( this.graphicsState, model_transform, white);
}

//populate with trees
Animation.prototype.drawForest = function(model_transform){
    var new_stack = []; 
    var moving_rate = Math.sin(this.graphicsState.animation_time/1200);
    if(!after_random){
      //trees
      for(var i = 0; i < 100; i++){
        var x = -200 + random() * 400;
        var y = -200 + random() * 400;
        var z = random() * 2 - 1;
        new_stack.push(model_transform);
        model_transform = mult(model_transform, translation(x, z, y));  
        trees.push(model_transform);
        this.drawTree(model_transform);
        model_transform = new_stack.pop();
      }
      //mushrooms
      for(var i = 0; i < 100; i++){
        var x = -200 + random() * 400;
        var y = -200 + random() * 400;
        var z = random();
        new_stack.push(model_transform);
        model_transform = mult(model_transform, translation(x, -1, y));      
        mushrooms.push(model_transform);
        this.drawMushroom(model_transform);
        model_transform = new_stack.pop();
      }
      //clouds
      for(var i = 0; i < 400; i++){
        var x = -200 + random() * 400;
        var y = -200 + random() * 400;
        var z = random() * 20 - 10;
        new_stack.push(model_transform);
        model_transform = mult(model_transform, translation(x, z, y));      
        clouds.push(model_transform);
        this.drawMushroom(model_transform);
        model_transform = new_stack.pop();
      }

    }
    else{
      for(var i = 0; i < trees.length/2; i++){
        //trees
        new_stack.push(model_transform);
        model_transform = trees[i];
        model_transform = mult(model_transform, translation(0, Math.sin(moving_rate%360),0));
        this.drawTree(model_transform);
        model_transform = new_stack.pop();
        //mushrooms
        new_stack.push(model_transform);
        model_transform = mushrooms[i];
        model_transform = mult(model_transform, translation(0, Math.sin(moving_rate%360),0));
        this.drawMushroom(model_transform);
        model_transform = new_stack.pop();
      }
      for(var i = trees.length/2; i < trees.length; i++){
        //trees
        new_stack.push(model_transform);
        model_transform = trees[i];
        model_transform = mult(model_transform, translation(0, -Math.sin(moving_rate%360),0));
        this.drawTree(model_transform);
        model_transform = new_stack.pop();
        //mushrooms
        new_stack.push(model_transform);
        model_transform = mushrooms[i];
        model_transform = mult(model_transform, translation(0, -Math.sin(moving_rate%360),0));
        this.drawMushroom(model_transform);
        model_transform = new_stack.pop();
      }
      for(var i = 0; i < clouds.length/2; i++)
      {
        //clouds
        new_stack.push(model_transform);
        model_transform = clouds[i];
        model_transform = mult(model_transform, translation(0, Math.sin(moving_rate%360),0));
        this.drawClouds(model_transform);
        model_transform = new_stack.pop();
      }
      for(var i = clouds.length/2; i < clouds.length; i++)
      {
        //clouds
        new_stack.push(model_transform);
        model_transform = clouds[i];
        model_transform = mult(model_transform, translation(0, -Math.sin(moving_rate%360),0));
        this.drawMushroom(model_transform);
        model_transform = new_stack.pop();
      }
    }

    after_random = 1;
}

Animation.prototype.writeText = function(model_transform){
    //first message
    model_transform = mult(model_transform, translation(15, 5, -10));
    model_transform = mult(model_transform, rotation(210, 0, 1, 0));
    this.m_text.set_string( "Look! There's a butterfly!" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
    model_transform = mult(model_transform, rotation(30, 0, -1, 0));
    //model_transform = mult(model_transform, translation(-15, -5, 10));
    //second message
    model_transform = mult(model_transform, translation(20, 10, -15));
    model_transform = mult(model_transform, rotation(90, 0, 1, 0));
    this.m_text.set_string( "I wonder where it's going?" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
    //model_transform = mult(model_transform, translation(-35, -15, 25));
    //third message
    model_transform = mult(model_transform, translation(-10, 20, -10));
    model_transform = mult(model_transform, rotation(45, 0, -1, 0));
    model_transform = mult(model_transform, rotation(30, 0, 0, 1));
    this.m_text.set_string( "Woah! I've never flown this high before!" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
    model_transform = mult(model_transform, rotation(30, 0, 0, -1));
    //fourth message
    model_transform = mult(model_transform, translation(10, 20, -10));
    model_transform = mult(model_transform, rotation(45, 0, 1, 0));
    this.m_text.set_string( "Everything looks so small!" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
    //fifth message
    model_transform = mult(model_transform, translation(38, 83, 38));
    model_transform = mult(model_transform, rotation(30, 0, -1, 0));
    model_transform = mult(model_transform, rotation(90, 0, 0, 1));
    model_transform = mult(model_transform, scale(5, 5, 5));
    this.m_text.set_string( "OH NO! What Happened?" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
    //fifth message
    model_transform = mult(model_transform, translation(0, 20, 0));
    model_transform = mult(model_transform, rotation(30, 0, 0, -1));
    this.m_text.set_string( "Where is my pretty little world?" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
    //sixth message
    model_transform = mult(model_transform, translation(0, 20, 0));
    model_transform = mult(model_transform, rotation(30, 0, 0, -1));
    model_transform = mult(model_transform, scale(3, 3, 3));
    this.m_text.set_string( "I'M THE SECOND TRUMAN :O" );
    this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
}


Animation.prototype.display = function(time)
	{  
		if(!time) time = 0;                                                               // Animate shapes based upon how much measured real time has transpired
		this.animation_delta_time = time - prev_time;                                     // by using animation_time
		if( animate ) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		var model_transform = mat4();	            // Reset this every frame.
		this.basis_id = 0;	                      // For the "axis" shape.  This variable uniquely marks each axis we draw in display() as it counts them up.
    
    shaders[ "Default" ].activate();                         // Keep the flags seen by the default shader program up-to-date
		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud );		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);    
		
    
		// *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
    // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
    this.graphicsState.lights = [];                    // First clear the light list each frame so we can replace & update lights.
    
    /*var light_orbit = [ Math.cos(this.graphicsState.animation_time/1000), Math.sin(this.graphicsState.animation_time/1000) ];
    this.graphicsState.lights.push( new Light( vec4(  30 * light_orbit[0],  30*light_orbit[1],  34 * light_orbit[0], 1 ), Color( 0, .4, 0, 1 ), 100000 ) );
    this.graphicsState.lights.push( new Light( vec4( -10 * light_orbit[0], -20*light_orbit[1], -14 * light_orbit[0], 0 ), Color( 1, 1, .3, 1 ), 100 * Math.cos(this.graphicsState.animation_time/10000 ) ) );
    */
    //var light_orbit = [ Math.cos(this.graphicsState.animation_time/1000), Math.sin(this.graphicsState.animation_time/1000) ];
    this.graphicsState.lights.push( new Light( vec4(  30 ,  30,  34, 1 ), Color( 0, .4, 0, 1 ), 100000 ) );
    this.graphicsState.lights.push( new Light( vec4( -10, -20, -14, 0 ), Color( 1, 1, .3, 1 ), 100 ) );
  

		/**********************************
		Start coding down here!!!!
		**********************************/                                     // From this point on down it's just some examples for you -- feel free to comment it all out.

    //model_transform = mult( model_transform, translation( 0, 0, -1*zoomBackFactor ) );

    var stack = [];
    var moving_rate = Math.sin(this.graphicsState.animation_time/300);

    //populate the forest
    stack.push(model_transform);
    model_transform = this.drawForest(model_transform);
    model_transform = stack.pop(); 

    //person
    stack.push(model_transform);
    model_transform = mult(model_transform, translation(0, Math.sin(moving_rate%360),0));
    model_transform = mult( model_transform, translation( 0, (this.graphicsState.animation_time)/1000, 0 ) );
    model_transform = mult( model_transform, translation( (this.graphicsState.animation_time)/1000, 0, 0 ) );
    model_transform = mult( model_transform, rotation( (90*this.graphicsState.animation_time)/2000, 0, -1, 0 ) );
    model_transform = mult( model_transform, translation( -(this.graphicsState.animation_time)/1000, 0, 0 ) );
    model_transform = this.drawPerson(model_transform); 
    model_transform = stack.pop();

    //draw the dome
    stack.push(model_transform);
    model_transform = mult(model_transform, scale(200, 160,200));
    this.m_sub.draw( this.graphicsState, model_transform, white);
    model_transform = stack.pop();

    //animate butterfly
    stack.push(model_transform);
    //model_transform = mult( model_transform, rotation( (10*this.graphicsState.animation_time)/1000, 1, 0, 0 ) );
    model_transform = mult( model_transform, translation( 0, (this.graphicsState.animation_time)/1000, 0 ) );
    model_transform = mult( model_transform, translation( (this.graphicsState.animation_time)/1000, 0, 0 ) );
    model_transform = mult( model_transform, rotation( (90*this.graphicsState.animation_time)/2000, 0, -1, 0 ) );
    model_transform = mult( model_transform, translation( -(this.graphicsState.animation_time)/1000, 0, 0 ) );
    model_transform = this.drawButterfly(model_transform);
    model_transform = stack.pop();

    //camera motion
    var x, y1,y2,y, z;
    if (this.graphicsState.animation_time == 0){
      this.graphicsState.camera_transform = lookAt( vec3(0,0,25), vec3(10,1,0), vec3(0,1,0) );
      //first message
      stack.push(model_transform);
      model_transform = mult(model_transform, translation(15, 8, -18));
      model_transform = mult(model_transform, rotation(210, 0, 1, 0));
      model_transform = mult(model_transform, scale(2, 2, 2));
      this.m_text.set_string( "Water's Adventure" );
      this.m_text.draw( this.graphicsState, model_transform, true, vec4(0,0,0,1) );
      model_transform = stack.pop();
    }
    if( animate){
      //first zoom in, look at butterfly, facing up
      //write words
      stack.push(model_transform);
      model_transform = this.writeText(model_transform); 
      model_transform = stack.pop();

      if (this.graphicsState.animation_time > 0){
        y1 = 0 + (this.graphicsState.animation_time)/800;
        z = 25 - (this.graphicsState.animation_time)/500;
        y2 = 3 + (this.graphicsState.animation_time)/1000;
        this.graphicsState.camera_transform = lookAt( vec3(0,y1,z), vec3(10,y2,0), vec3(0,1,0) );
      }

      //second zoom out, facing down
      if (this.graphicsState.animation_time > 6000){
        z = 25 + (this.graphicsState.animation_time-6000)/500 - (6000)/500 ;
        y1 = 0 + (this.graphicsState.animation_time-6000)/500 + (6000)/800;
        y2 = 3 + (this.graphicsState.animation_time-6000)/1000 + (6000)/1000;
        this.graphicsState.camera_transform = lookAt( vec3(0,y1,z), vec3(10,y2,0), vec3(0,1,0));
      }

      //third look at entire picutre from top
      if (this.graphicsState.animation_time > 15000){
        z = 25 + (this.graphicsState.animation_time-15000)/500 - (6000)/500 + (9000)/500;
        y1 = 0 + (this.graphicsState.animation_time-15000)/200 + (6000)/800 + (9000)/500;
        y2 = 3 + (this.graphicsState.animation_time-15000)/2000 + (6000)/1000 + (9000)/1000;
        this.graphicsState.camera_transform = lookAt( vec3(0,y1,z), vec3(10,y2,0), vec3(0,1,0));
      }

      //third look at entire picutre from top
      if (this.graphicsState.animation_time > 40000){
        z = 25 + (this.graphicsState.animation_time-40000)/500 - (6000)/500 + (9000)/500 + 25000/500;
        y1 = 0 + (this.graphicsState.animation_time-40000)/100 + (6000)/800 + (9000)/500 + 25000/200;
        y2 = 3 + (this.graphicsState.animation_time-40000)/2000 + (6000)/1000 + (9000)/1000 + 25000/2000;
        this.graphicsState.camera_transform = lookAt( vec3(0,y1,z), vec3(10,y2,0), vec3(0,1,0));
      }
      if (this.graphicsState.animation_time > 90000){
        z = 25 + (50000)/500 - (6000)/500 + (9000)/500 + 25000/500;
        y1 = 0 + (50000)/100 + (6000)/800 + (9000)/500 + 25000/200;
        y2 = 3 + (50000)/2000 + (6000)/1000 + (9000)/1000 + 25000/2000;
        this.graphicsState.camera_transform = lookAt( vec3(0,y1,z), vec3(10,y2,0), vec3(0,1,0));
      }
    }

  }






