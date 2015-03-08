(function() {

    // options
  var auto = true;
  var voice = true;
  var history = 20;
  var isoCamDist = 100;
    // ---

  var renderer, cssRenderer;
  var scene, cssScene;

  var camera, cameraB;
  var controls;

  var cubeMesh;
  var cubeMeshHelper;

  var stats;

  var slides = [];
  var templates = {};

  var $input = $('#input');
  var $searchField = $input.find('input');

  var minZ = 0;

  
  function loadTemplates() {
    templates['slide'] = _.template( $('#tpl-slide').html() );
  }
  loadTemplates();


  function initStats() {
    stats = new Stats();
    stats.setMode(0);

    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild( stats.domElement );
  }
  initStats();


  var Slide = function ( d ) {
    var $slide = $( templates.slide( { d: d } ) );
    var slide = $slide.get(0);

    var object = new THREE.CSS3DObject( slide );

    object.d = d;

    return object;
  };


  function init() {
    var aspect = window.innerWidth / window.innerHeight;
    var dist = isoCamDist;

    camera = new THREE.PerspectiveCamera( 75, aspect, 1, 5000 );
    camera.position.y = 25;
    
    cameraB = new THREE.OrthographicCamera( -dist * aspect, dist * aspect, dist, -dist, 1, 1000 );
    cameraB.position.set( dist, dist, dist );

    renderer = new THREE.WebGLRenderer( {
      antialias: true
    } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    var el = renderer.domElement;
    document.getElementById( 'container' ).appendChild( el );

    cssRenderer = new THREE.CSS3DRenderer();
    cssRenderer.setSize( window.innerWidth, window.innerHeight );
    var cssEl = cssRenderer.domElement;
    cssEl.style.position = 'absolute';
    cssEl.style.top = 0;
    document.getElementById( 'cssContainer' ).appendChild( cssEl );

    cssScene = new THREE.Scene();

    document.body.addEventListener( 'mousewheel', onMouseWheel, false );

    window.addEventListener( 'resize', onWindowResize, false );

    $input.find( 'form' ).on( 'submit', function (evt) {
      evt.preventDefault();

      $searchField.blur();

      search( $searchField.val() );
    });

    $searchField.on( 'focus blur', function ( evt ) {
      auto = ( evt.type === 'blur' );
      $input.toggleClass( 'expanded', !auto );
      
      if ( evt.type === 'focus' ) {
        $searchField.val( '' );
      }
    });

    initCube();
  }


  function initCube() {
    cubeScene = new THREE.Scene();

    var geometry = new THREE.BoxGeometry( 25, 25, 25 );
    var mesh = cubeMesh = new THREE.Mesh( geometry );
    mesh.visible = false;
    
    var helper = cubeMeshHelper = new THREE.BoxHelper( cubeMesh );
    helper.material.color.set( 'white' );
    helper.material.linewidth = 2;
    helper.material.linecap = 'round';
    helper.material.linejoin = 'miter';

    cubeScene.add( mesh );
    cubeScene.add( helper );

    cameraB.lookAt( cubeScene.position );
  }


    // caution: very hacky because it relies on the demo form of acapella tts
  function preloadTTS(data, i) {
    var datum = data[i];

    datum && $.ajax({
      url: 'http://numbers.nihil.cc/tts.php',
        data: {
          s: 'sonid15',
          v: _.sample(['Andreas', 'Jonas', 'Julia', 'Klaus', 'Lea', 'Sarah']),
          q: datum.text
        },
        method: 'POST'
    })
    .done(function(raw) {
      datum.tts = JSON.parse(raw).data;
    })
    .always(function() {
      preloadTTS(data, i+1);
    });
  }


  function search(term) {
    run(term);
    console.log(window.statements);

/*
    var data = window.statements;
    data.push({ text: 'hello world this is the first slide '});
    data.push({ text: 'this is the second slide '});
    data.push({ text: 'this is the third slide '});
    data.push({ text: 'this is the 4th slide '});
    data.push({ text: 'this is the 5th slide '});
    data.push({ text: 'this is the 6th slide '});
    data.push({ text: 'this is the 7th slide '});
    data.push({ text: 'this is the 8th slide '});
    data.push({ text: 'this is the 9th slide '});
    data.push({ text: 'this is the 10th slide '});
*/
//TODO: fix for now
    load();
  }


  function load() {
    var data = _.filter( window.statements, function( d ) {
      return ( !( 'loaded' in d ) || !d.loaded );
    });

    if (!data.length) {
      return setTimeout(load, 3e3);
    }

      // load next three slices
    onLoad( data.slice(0, 3) );
  }
    

  function onLoad( data ) {
    if (voice && data) {
      preloadTTS( data, 0 );
    }

    var slides = cssScene.children;
    
    _.each( data, function ( d ) {
      d.loaded = true;
      var object = new Slide( d );

      var lastObject = _.last( slides );
      var lastZ = ( lastObject ) ? lastObject.position.z : 0;

      object.position.z = lastZ - 1000;
      cssScene.add( object );
    } );


    var camZ = camera.position.z;
    var pastSlides = _.sortBy(
      _.filter(slides, function(object) {
        return (object.position.z > camZ);
      }),
      function(d) {
        return d.position.z;
      }
    ).reverse();

    _.each(
      pastSlides.slice( 0, Math.max( 0,  pastSlides.length - history ) ), 
      function ( object ) {
        minZ = object.position.z;
        cssScene.remove( object );
      }
    );
  }


  function restart() {
    auto = true;
  }


//TODO: improve
  function playVoice( object ) {
    if (object.d.tts && !object.d.voice) {
      $('#voice').prop('src', object.d.tts)[0].play();

      object.d.voice = true;
    }
  }


  function move( delta ) {
    var focal = 500;

    var camZ = camera.position.z;
    var newZ = camZ + delta;
    var focalZ = newZ - focal;
    var left = 0;

    _.each( cssScene.children, function( object, i ) {
      var el = object.element;

      var opacity = 0;
      var z = object.position.z;
      var delta = newZ - z;

      if ( delta > 0 ) {
        var dist = Math.min( focal * 4, focalZ - z );
        if ( delta < focal ) {
          dist *= 3;
        }
        opacity = Math.max( 0, 1 - Math.abs( dist / ( focal * 2 ) ) );
        left++;

        var bgImage = (object.d.image && delta < focal * 3) ?
          'url('+object.d.image+')' : 'none';

        if (el.style.backgroundImage != bgImage) {
          el.style.backgroundImage = bgImage;
        }
      }

      if (voice && opacity > 0.3) {
        playVoice(object);
      }

      var newOpacity = Math.floor(opacity * 100) / 100;

      if (el.style.opacity !== newOpacity) {
        el.style.opacity = newOpacity;
        el.style.display = ( newOpacity ) ? '' : 'none';
      }
    });

    if (left > 0) {
      camera.position.z = Math.min( minZ, newZ );
      if (left < 2) {
        load();
      }
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
    var width = window.innerWidth;
    var height = window.innerHeight;
    var dist = isoCamDist;

    aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    cameraB.left = -dist * aspect;
    cameraB.right = dist * aspect;
    cameraB.updateProjectionMatrix();

    renderer.setSize( width, height );
    cssRenderer.setSize( width, height );
  }


  function animate() {
    requestAnimationFrame( animate );

    if ( auto === true ) {
      move( -2 );
    }

    cubeMesh.rotation.x += 0.005;
    cubeMesh.rotation.y += 0.01;

    render();
  }

  function render() {
    renderer.render( cubeScene, cameraB );
    cssRenderer.render( cssScene, camera );

    if (stats) {
      stats.update();
    }
  }

  init();
  animate();
  load();

  setTimeout(function() {
    $searchField.focus();
  }, 400);

})();
