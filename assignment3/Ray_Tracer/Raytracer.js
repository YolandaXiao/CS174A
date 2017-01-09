// CS 174a Project 3 Ray Tracer Skeleton

function Ball( )
{                                 // *** Notice these data members. Upon construction, a Ball first fills them in with arguments:
  var members = [ "position", "size", "color", "k_a", "k_d", "k_s", "n", "k_r", "k_refract", "refract_index" ];
  for( i in arguments )    this[ members[ i ] ] = arguments[ i ];
  this.construct();
}

Ball.prototype.construct = function()
{
  this.model_transform = mat4();
  this.model_transform = mult(this.model_transform, translation(this.position));
  this.model_transform = mult(this.model_transform, scale(this.size));
  this.inverse_transform = inverse(this.model_transform);
}

Ball.prototype.intersect = function( ray, existing_intersection, minimum_dist )
{
  var s = mult_vec(this.inverse_transform, ray.origin).slice(0,3);
  var c = mult_vec(this.inverse_transform, ray.dir).slice(0,3);
  var b = dot(s, c);
  var a = dot(c, c);
  var delta = Math.pow(b, 2) - a*(dot(s,s)-1);
  var delta_term = Math.sqrt(delta)/a;
  var x1 = -b/a - delta_term;
  var x2 = -b/a + delta_term;
  var result = x1;

  if(delta > 0)
  {
    if( x1 < minimum_dist && x2 > minimum_dist)
    {
      result = x2;
    } 
  }
  else
  {
    return existing_intersection;
  }

  var intersect_position = add(s,scale_vec(result,c));
  var normal = normalize(mult_vec(transpose(this.inverse_transform),intersect_position).slice(0,3)); //??
  if(dot(normal,ray.dir.slice(0,3)) > 0)
    normal = scale_vec(-1,normal);

  if(result > minimum_dist && result < existing_intersection.distance)
  {
    existing_intersection.distance = result;
    existing_intersection.ball = this; 
    existing_intersection.normal = normal;
  }

  return existing_intersection;
}

var mult_3_coeffs = function( a, b ) { return [ a[0]*b[0], a[1]*b[1], a[2]*b[2] ]; };       // Convenient way to combine two color vectors

var background_functions = {                // These convert a ray into a color even when no balls were struck by the ray.
waves: function( ray, distance )
{
  return Color( .5 * Math.pow( Math.sin( 2 * ray.dir[0] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[0] + Math.sin( 10 * ray.dir[1] ) + Math.sin( 10 * ray.dir[2] ) ) ),
                .5 * Math.pow( Math.sin( 2 * ray.dir[1] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[1] + Math.sin( 10 * ray.dir[0] ) + Math.sin( 10 * ray.dir[2] ) ) ),
                .5 * Math.pow( Math.sin( 2 * ray.dir[2] ), 4 ) + Math.abs( .5 * Math.cos( 8 * ray.dir[2] + Math.sin( 10 * ray.dir[1] ) + Math.sin( 10 * ray.dir[0] ) ) ), 1 );
},
lasers: function( ray, distance ) 
{
  var u = Math.acos( ray.dir[0] ), v = Math.atan2( ray.dir[1], ray.dir[2] );
  return Color( 1 + .5 * Math.cos( Math.floor( 20 * u ) ), 1 + .5 * Math.cos( Math.floor( 20 * v ) ), 1 + .5 * Math.cos( Math.floor( 8 * u ) ), 1 );
},
mixture:       function( ray, distance ) { return mult_3_coeffs( background_functions["waves"]( ray, distance ), background_functions["lasers"]( ray, distance ) ).concat(1); },
ray_direction: function( ray, distance ) { return Color( Math.abs( ray.dir[ 0 ] ), Math.abs( ray.dir[ 1 ] ), Math.abs( ray.dir[ 2 ] ), 1 );  },
color:         function( ray, distance ) { return background_color;  }
};
var curr_background_function = "color";
var background_color = vec4( 0, 0, 0, 1 );

// *******************************************************
// Raytracer class - gets registered to the window by the Animation object that owns it
function Raytracer( parent )  
{
  var defaults = { width: 32, height: 32, near: 1, left: -1, right: 1, bottom: -1, top: 1, scanline: 0, visible: true, anim: parent, ambient: vec3( .1, .1, .1 ) };
  for( i in defaults )  this[ i ] = defaults[ i ];
  
  this.m_square = new N_Polygon( 4 );                   // For texturing with and showing the ray traced result
  this.m_sphere = new Subdivision_Sphere( 4, true );    // For drawing with ray tracing turned off
  
  this.balls = [];    // Array for all the balls
    
  initTexture( "procedural", true, true );      // Our texture for drawing the ray trace    
  textures["procedural"].image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"   // Blank gif file
  
  this.scratchpad = document.createElement('canvas');   // A hidden canvas for assembling the texture
  this.scratchpad.width  = this.width;
  this.scratchpad.height = this.height;
  
  this.scratchpad_context = this.scratchpad.getContext('2d');
  this.imageData          = new ImageData( this.width, this.height );     // Will hold ray traced pixels waiting to be stored in the texture
  
  this.make_menu();
}

Raytracer.prototype.toggle_visible = function() { this.visible = !this.visible; document.getElementById("progress").style = "display:inline-block;" };

Raytracer.prototype.make_menu = function()      // The buttons
{
  document.getElementById( "raytracer_menu" ).innerHTML = "<span style='white-space: nowrap'><button id='toggle_raytracing' class='dropbtn' style='background-color: #AF4C50'>Toggle Ray Tracing</button> \
                                                           <button onclick='document.getElementById(\"myDropdown2\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #8A8A4C'>Select Background Effect</button><div id='myDropdown2' class='dropdown-content'>  </div>\
                                                           <button onclick='document.getElementById(\"myDropdown\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #4C50AF'>Select Test Case</button><div id='myDropdown' class='dropdown-content'>  </div> \
                                                           <button id='submit_scene' class='dropbtn'>Submit Scene Textbox</button> \
                                                           <div id='progress' style = 'display:none;' ></div></span>";
  for( i in test_cases )
  {
    var a = document.createElement( "a" );
    a.addEventListener("click", ( function( i, self ) { return function() { load_case( i ); self.parseFile(); }; } )( i, this ), false);
    a.innerHTML = i;
    document.getElementById( "myDropdown" ).appendChild( a );
  }
  for( j in background_functions )
  {
    var a = document.createElement( "a" );
    a.addEventListener("click", ( function( j ) { return function() { curr_background_function = j; } } )( j ), false);
    a.innerHTML = j;
    document.getElementById( "myDropdown2" ).appendChild( a );
  }
  
  document.getElementById( "input_scene" ).addEventListener( "keydown", function(event) { event.cancelBubble = true; }, false );
  
  window.addEventListener( "click", function(event) {  if (!event.target.matches('.dropbtn')) {    
  document.getElementById( "myDropdown"  ).classList.remove("show");
  document.getElementById( "myDropdown2" ).classList.remove("show"); } }, false );

  document.getElementById( "toggle_raytracing" ).addEventListener("click", this.toggle_visible.bind( this ), false);
  document.getElementById( "submit_scene" ).addEventListener("click", this.parseFile.bind( this ), false);
}

Raytracer.prototype.getDir = function( ix, iy ) {
  var a = ix/this.width;
  var b = iy/this.height;
  var x = (a-1/2)*(this.right-this.left);
  var y = (b-1/2)*(this.top-this.bottom);
  return vec4( x, y, -this.near, 0 );   
}
  
Raytracer.prototype.trace = function( ray, color_remaining, shadow_test_light_source )
{ 
  if( length( color_remaining ) < .3 )    return Color( 0, 0, 0, 1 );  // Is there any remaining potential for brightening this pixel even more?

  var closest_intersection = { distance: Number.POSITIVE_INFINITY }    // An empty intersection object
  
  //get intersection point from intersect()
  var ball_len = this.balls.length;
  for(var i = 0; i < ball_len; i++)
  {
    var minimum_dist;
    if(equal(ray.origin.slice(0,3),vec3(0,0,0)))
      minimum_dist = 0.1;
    else
      minimum_dist = 0.0001;
    closest_intersection = this.balls[i].intersect(ray, closest_intersection, minimum_dist);
  }

  //shadow
  if (shadow_test_light_source) {
    if (closest_intersection.distance < length(subtract(shadow_test_light_source.position, ray.origin)))
      return Color(0,0,0,1);
    else 
      return Color(1,1,1,1);
  }

  if( !closest_intersection.ball )
    return mult_3_coeffs( this.ambient, background_functions[ curr_background_function ] ( ray ) ).concat(1);  

  //iterate through the light sources and get shadow light
  var sphere_color = closest_intersection.ball.color;
  var surface_color = scale_vec(closest_intersection.ball.k_a,sphere_color).slice(0,3);
  var intersect_position = add(ray.origin,scale_vec(closest_intersection.distance,ray.dir));
  //var intersect_position = add(ray.origin.slice(0,3),scale_vec(closest_intersection.ball.distance,ray.dir.slice(0,3)));
  var n = closest_intersection.ball.n;
  var N = closest_intersection.normal;
  var light_len = this.anim.graphicsState.lights.length;
  for(var i = 0; i < light_len; i++)
  {
    var light_color = this.anim.graphicsState.lights[i].color.slice(0,3);
    var light_position = this.anim.graphicsState.lights[i].position;
    //shadow test
    var L = normalize(subtract(light_position,intersect_position).slice(0,3)); 
    var L_ray = { origin: intersect_position, dir: L.concat(0) };
    var color_value = this.trace(L_ray,Color(1,1,1,1).slice(0,3),this.anim.graphicsState.lights[i]);
    if(color_value[0]!=1)
      continue;
    //diffuse
    var diffuse_color = closest_intersection.ball.k_d * Math.max(dot(N,L),0);
    diffuse_color = scale_vec(diffuse_color,sphere_color);
    //specular
    var R = normalize(subtract(scale_vec(2*dot(N,L),N),L)); 
    var V = normalize(subtract(ray.origin,intersect_position).slice(0,3)); 
    var specular_color = closest_intersection.ball.k_s * Math.pow(Math.max(dot(R,V),0),n);
    specular_color = scale_vec(specular_color,Color(1,1,1,1).slice(0,3));
    //surface_color
    surface_color = add(surface_color,mult_3_coeffs(light_color,diffuse_color.slice(0,3)));
    //surface_color = add(surface_color,specular_color);
    surface_color = add(surface_color,mult_3_coeffs(light_color,specular_color.slice(0,3)));
  }
  //make sure color is in range
  for(var i = 0; i < 3; i++)
  {
    if(surface_color[i]>1)
      surface_color[i]=1;
    if(surface_color[i]<0)
      surface_color[i]=0;
  }
  //recursive part
  var color_remaining_update = mult_3_coeffs(color_remaining, subtract(Color(1,1,1,1).slice(0,3),surface_color));
  var color_remaining_reflect = scale_vec(closest_intersection.ball.k_r, color_remaining_update);
  var color_remaining_refract = scale_vec(closest_intersection.ball.k_refract, color_remaining_update);
  var L = scale_vec(-1, normalize(ray.dir.slice(0,3)));
  var R = normalize(subtract(scale_vec(2*dot(N,L),N),L)); 
  //get reflect color from relected ray
  var reflect_ray = { origin: intersect_position, dir: R.concat(0) };
  var reflect_color = scale_vec(closest_intersection.ball.k_r,this.trace(reflect_ray,color_remaining_reflect,false).slice(0,3)) ;
  //get refract color from refracted ray
  var r = closest_intersection.ball.refract_index;
  L = normalize(ray.dir.slice(0,3));
  var c = dot(scale_vec(-1,N),L);
  var refract_ray1 = scale_vec(r,L);
  var refract_ray2 = scale_vec(r*c-Math.sqrt(1-Math.pow(r,2)*(1-Math.pow(c,2))),N);
  var refract_ray3 = normalize(add(refract_ray1,refract_ray2));
  var refract_ray = { origin: intersect_position, dir: refract_ray3.concat(0) };
  var refract_color = scale_vec(closest_intersection.ball.k_refract,this.trace(refract_ray,color_remaining_refract,false).slice(0,3)) ;
  //add colors and return
  var pixel_color = add(surface_color,mult_3_coeffs(subtract(Color(1,1,1,1).slice(0,3),surface_color),add(reflect_color,refract_color)));
  return pixel_color.concat(1);
}

Raytracer.prototype.parseLine = function( tokens )            // Load the text lines into variables
{
  switch( tokens[0] )
    {
        case "NEAR":    this.near   = tokens[1];  break;
        case "LEFT":    this.left   = tokens[1];  break;
        case "RIGHT":   this.right  = tokens[1];  break;
        case "BOTTOM":  this.bottom = tokens[1];  break;
        case "TOP":     this.top    = tokens[1];  break;
        case "RES":     this.width  = tokens[1];  
                        this.height = tokens[2]; 
                        this.scratchpad.width  = this.width;
                        this.scratchpad.height = this.height; 
                        break;
        case "SPHERE":
          this.balls.push( new Ball( vec3( tokens[1], tokens[2], tokens[3] ), vec3( tokens[4], tokens[5], tokens[6] ), vec3( tokens[7], tokens[8], tokens[9] ), 
                             tokens[10], tokens[11], tokens[12], tokens[13], tokens[14], tokens[15], tokens[16] ) );
          break;
        case "LIGHT":
          this.anim.graphicsState.lights.push( new Light( vec4( tokens[1], tokens[2], tokens[3], 1 ), Color( tokens[4], tokens[5], tokens[6], 1 ), 100000 ) );
          break;
        case "BACK":     background_color = Color( tokens[1], tokens[2], tokens[3], 1 );  gl.clearColor.apply( gl, background_color ); break;
        case "AMBIENT":
          this.ambient = vec3( tokens[1], tokens[2], tokens[3] );          
    }
}

Raytracer.prototype.parseFile = function()        // Move through the text lines
{
  this.balls = [];   this.anim.graphicsState.lights = [];
  this.scanline = 0; this.scanlines_per_frame = 1;                            // Begin at bottom scanline, forget the last image's speedup factor
  document.getElementById("progress").style = "display:inline-block;";        // Re-show progress bar
  this.anim.graphicsState.camera_transform = mat4();                          // Reset camera
  var input_lines = document.getElementById( "input_scene" ).value.split("\n");
  for( var i = 0; i < input_lines.length; i++ ) this.parseLine( input_lines[i].split(/\s+/) );
}

Raytracer.prototype.setColor = function( ix, iy, color )        // Sends a color to one pixel value of our final result
{
  var index = iy * this.width + ix;
  this.imageData.data[ 4 * index     ] = 255.9 * color[0];    
  this.imageData.data[ 4 * index + 1 ] = 255.9 * color[1];    
  this.imageData.data[ 4 * index + 2 ] = 255.9 * color[2];    
  this.imageData.data[ 4 * index + 3 ] = 255;  
}

Raytracer.prototype.display = function(time)
{
  var desired_milliseconds_per_frame = 100;
  if( ! this.prev_time ) this.prev_time = 0;
  if( ! this.scanlines_per_frame ) this.scanlines_per_frame = 1;
  this.milliseconds_per_scanline = Math.max( ( time - this.prev_time ) / this.scanlines_per_frame, 1 );
  this.prev_time = time;
  this.scanlines_per_frame = desired_milliseconds_per_frame / this.milliseconds_per_scanline + 1;
  
  if( !this.visible )  {                         // Raster mode, to draw the same shapes out of triangles when you don't want to trace rays
    for( i in this.balls )
        this.m_sphere.draw( this.anim.graphicsState, this.balls[i].model_transform, new Material( this.balls[i].color.concat( 1 ), 
                                                                              this.balls[i].k_a, this.balls[i].k_d, this.balls[i].k_s, this.balls[i].n ) );
    this.scanline = 0;    document.getElementById("progress").style = "display:none";     return; }; 
  if( !textures["procedural"] || ! textures["procedural"].loaded ) return;      // Don't display until we've got our first procedural image
  
  this.scratchpad_context.drawImage(textures["procedural"].image, 0, 0 );
  this.imageData = this.scratchpad_context.getImageData(0, 0, this.width, this.height );    // Send the newest pixels over to the texture
  var camera_inv = inverse( this.anim.graphicsState.camera_transform );
   
  for( var i = 0; i < this.scanlines_per_frame; i++ )     // Update as many scanlines on the picture at once as we can, based on previous frame's speed
  {
    var y = this.scanline++;
    if( y >= this.height ) { this.scanline = 0; document.getElementById("progress").style = "display:none" };
    document.getElementById("progress").innerHTML = "Rendering ( " + 100 * y / this.height + "% )..."; 
    for ( var x = 0; x < this.width; x++ )
    {
      var ray = { origin: mult_vec( camera_inv, vec4( 0, 0, 0, 1 ) ), dir: mult_vec( camera_inv, this.getDir( x, y ) ) };   // Apply camera
      this.setColor( x, y, this.trace( ray, vec3( 1, 1, 1 ) ) );                                    // ******** Trace a single ray *********
    }
  }
  
  this.scratchpad_context.putImageData( this.imageData, 0, 0);                    // Draw the image on the hidden canvas
  textures["procedural"].image.src = this.scratchpad.toDataURL("image/png");      // Convert the canvas back into an image and send to a texture
  
  this.m_square.draw( new GraphicsState( mat4(), mat4(), 0 ), mat4(), new Material( Color( 0, 0, 0, 1 ), 1,  0, 0, 1, "procedural" ) );

  if( !this.m_text  ) { this.m_text  = new Text_Line( 45 ); this.m_text .set_string("Open some test cases with the blue button."); }
  if( !this.m_text2 ) { this.m_text2 = new Text_Line( 45 ); this.m_text2.set_string("Click and drag to steer."); }
  
  var model_transform = rotation( -90, vec3( 0, 1, 0 ) );                           
      model_transform = mult( model_transform, translation( .3, .9, .9 ) );
      model_transform = mult( model_transform, scale( 1, .075, .05) );
  
  this.m_text .draw( new GraphicsState( mat4(), mat4(), 0 ), model_transform, true, vec4(0,0,0, 1 - time/10000 ) );         
      model_transform = mult( model_transform, translation( 0, -1, 0 ) );
  this.m_text2.draw( new GraphicsState( mat4(), mat4(), 0 ), model_transform, true, vec4(0,0,0, 1 - time/10000 ) );   
}

Raytracer.prototype.init_keys = function()   {  shortcut.add( "SHIFT+r", this.toggle_visible.bind( this ) );  }

Raytracer.prototype.update_strings = function( debug_screen_object )    // Strings that this displayable object (Raytracer) contributes to the UI:
  { }