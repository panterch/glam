(function() {

  var camera;
  var renderer;
  var scene;
  var controls;

  var stats;
  var auto = true;

  var slides = [];
  var templates = {};

  var $input = $('#input');
  
  (function loadTemplates() {
    templates['slide'] = _.template( $('#tpl-slide').html() );
    templates['text'] = _.template( $('#tpl-slide-text').html() );
  })();

  (function initStats() {
    stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms

    // align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild( stats.domElement );
  })();


  var Slide = function ( d ) {

    var $slide = $( templates.slide( { d: d } ) );
    var slide = $slide.get(0);

    $slide.html( templates.text( { d: d } ) );

    var object = new THREE.CSS3DObject( slide );

    return object;

  };

  function init() {

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );
    camera.position.y = 25;
    
    scene = new THREE.Scene();

    renderer = new THREE.CSS3DRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;

    document.getElementById( 'container' ).appendChild( renderer.domElement );

    document.body.addEventListener( 'mousewheel', onMouseWheel, false );

    window.addEventListener( 'resize', onWindowResize, false );

    $input.find( 'form' ).on( 'submit', function (evt) {
      evt.preventDefault();

      var field = evt.target[0];

      search( field.value );

      field.blur();
    });

    var $serachField = $input.find( 'input' );

    $serachField.on( 'focus blur', function ( evt ) {
      auto = ( evt.type === 'blur' );
      $input.toggleClass( 'expanded', !auto );
      
      if ( evt.type === 'focus' ) {
        $serachField.val( '' );
      }
    });
  }

  function search(term) {
    console.log(term);

    restart();
  }


  function load() {
    onLoad();
  }
    
  function onLoad( raw ) {
    //var data = raw;
    var data = [{
      type: 'text',
      text: 'Hello world, this is the first sentence'
    }, {
      type: 'text',
      text: 'another thing in this world'
    }, {
      type: 'text',
      text: 'another thing in this world'
    }, {
      type: 'text',
      text: 'another thing in this world'
    }, {
      type: 'text',
      text: 'another thing in this world'
    }];

    _.each( data, function( d ) {
      var object = new Slide( d );

      var lastObject = _.last( scene.children );
      var lastZ = ( lastObject ) ? lastObject.position.z : 0;

      object.position.z = lastZ - 1000;
      scene.add( object );

    } );

    animate();
  }


  function restart() {
    auto = true;
    camera.position.z = 0;
  }


  function move( delta ) {
    var focal = 500;

    var camZ = camera.position.z;
    var newZ = camZ + delta;
    var focalZ = newZ - focal;
    var left = false;

    _.each( scene.children, function( object ) {
      var opacity = 0;
      var z = object.position.z;
      var delta = newZ - z;

      if ( delta > 0 ) {
        var dist = Math.min( focal * 4, focalZ - z );
        if ( delta < focal ) {
          dist *= 3;
        }
        opacity = Math.max( 0, 1 - Math.abs( dist / ( focal * 2 ) ) );
        left = true;
      }

      object.element.style.opacity = opacity;
      object.element.style.visibility = ( opacity ) ? 'visible' : 'hidden';
    });

    if (left) {
      camera.position.z = Math.min( 0, newZ );
      render();
    }
    else {
      auto = true;
    }
  }


  function onMouseWheel( event ) {
    auto = false;

    move( -event.wheelDelta );
  }


  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

  }


  function animate() {
    requestAnimationFrame( animate );

    if ( auto === true ) {
      move( -2 );
    }
  }

  function render() {
    renderer.render( scene, camera );
    stats.update();
  }

  init();
  load();

})();