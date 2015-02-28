(function() {

  var canvasRenderer, cssRenderer;
  var scene, cssScene;

  var camera, cameraB;
  var controls;

  var preloaderMesh;

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
    
    cameraB = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
    cameraB.position.z = 400;

    canvasRenderer = new THREE.CanvasRenderer( {
      antialias: true
    } );
    canvasRenderer.setPixelRatio( window.devicePixelRatio );
    canvasRenderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById( 'container' ).appendChild( canvasRenderer.domElement );

    cssRenderer = new THREE.CSS3DRenderer();
    cssRenderer.setSize( window.innerWidth, window.innerHeight );
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
    document.getElementById( 'cssContainer' ).appendChild( cssRenderer.domElement );

    cssScene = new THREE.Scene();

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

    initPreloader();
  }

  function initPreloader() {
    preloaderScene = new THREE.Scene();

    var geometry = new THREE.BoxGeometry( 50, 50, 50 );
    preloaderMesh = new THREE.Mesh( geometry );
    preloaderMesh.visible = false;
    
    var helper = new THREE.BoxHelper( preloaderMesh );
    helper.material.color.set( 'white' );
    helper.material.linewidth = 2;
    helper.material.linecap = 'round';
    helper.material.linejoin = 'miter';

    preloaderScene.add( preloaderMesh );
    preloaderScene.add( helper );
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

      var lastObject = _.last( cssScene.children );
      var lastZ = ( lastObject ) ? lastObject.position.z : 0;

      object.position.z = lastZ - 1000;
      cssScene.add( object );

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

    _.each( cssScene.children, function( object ) {
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

    cameraB.aspect = window.innerWidth / window.innerHeight;
    cameraB.updateProjectionMatrix();

    canvasRenderer.setSize( window.innerWidth, window.innerHeight );
    cssRenderer.setSize( window.innerWidth, window.innerHeight );
  }


  function animate() {
    requestAnimationFrame( animate );

    if ( auto === true ) {
      move( -2 );
    }

    preloaderMesh.rotation.x += 0.005;
    preloaderMesh.rotation.y += 0.01;

    render();
  }

  function render() {
    canvasRenderer.render( preloaderScene, cameraB );
    cssRenderer.render( cssScene, camera );

    stats.update();
  }

  init();
  load();

})();