var mockData = ["London ist Hauptstadt des Vereinigten Königreichs.","Anne Keothavong ist eine britische Tennisspielerin.","London ist eine Hauptstadt des Vereinigten Königreichs.","Boris Johnson ist eine britischer Journalist, Publizist, Schriftsteller und Politiker der Conservative Party.","New York City ist eine Metropole an der Ostküste der Vereinigten Staaten.","Bill de Blasio ist eine Bürgermeister von New York, New York, USA.","Manhattan ist eine einer von 5 Stadtbezirken (Borough) von New York City.","Budapest ist eine Hauptstadt von Ungarn.","István Tarlós.","Berlin ist eine Hauptstadt von Deutschland und ein Land in Deutschland.","Los Angeles ist eine Metropole im US-Bundesstaat Kalifornien.","Eric Garcetti ist eine Bürgermeister von Los Angeles.","Klaus Wowereit ist eine Regierender Bürgermeister von Berlin.","West-Berlin ist eine ehemalige Westsektoren von Berlin.","Berlin ist eine Hauptstadt von Deutschland und ein Land in Deutschland.","ENDE"];

(function() {

  var renderer, cssRenderer;
  var scene, cssScene;

  var camera, cameraB;
  var controls;

  var preloaderMesh;
  var preloaderMeshHelper;

  var stats;
  var auto = true;
  var voice = false;

  var slides = [];
  var templates = {};

  var $input = $('#input');

  
  (function loadTemplates() {
    templates['slide'] = _.template( $('#tpl-slide').html() );
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

    var object = new THREE.CSS3DObject( slide );

    object.d = d;

    return object;
  };


  function init() {
    var aspect = window.innerWidth / window.innerHeight;

    camera = new THREE.PerspectiveCamera( 75, aspect, 1, 5000 );
    camera.position.y = 25;
    
    var dist = 100;

    cameraB = new THREE.OrthographicCamera( -dist * aspect, dist * aspect, dist, -dist, 1, 1000 );
    cameraB.position.set( dist, dist, dist );

    renderer = new THREE.WebGLRenderer( {
      antialias: true
    } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.getElementById( 'container' ).appendChild( renderer.domElement );

    cssRenderer = new THREE.CSS3DRenderer();
    cssRenderer.setSize( window.innerWidth, window.innerHeight );
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
    document.getElementById( 'cssContainer' ).appendChild( cssRenderer.domElement );

    cssScene = new THREE.Scene();

    // NOTE: no mousewheel support for now
//    document.body.addEventListener( 'mousewheel', onMouseWheel, false );

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

    var geometry = new THREE.BoxGeometry( 25, 25, 25 );
    var mesh = preloaderMesh = new THREE.Mesh( geometry );
    mesh.visible = false;
    
    var helper = preloaderMeshHelper = new THREE.BoxHelper( preloaderMesh );
    helper.material.color.set( 'white' );
    helper.material.linewidth = 2;
    helper.material.linecap = 'round';
    helper.material.linejoin = 'miter';

    preloaderScene.add( mesh );
    preloaderScene.add( helper );

    cameraB.lookAt( preloaderScene.position );
  }


    // caution: very hacky because it relies on the demo form of acapella tts
  function preloadTTS(data, i) {
    var datum = data[i];

    if (!datum) { return; }

    $.ajax({
      url: 'http://numbers.korny.cc/tts.php',
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

//TODO: fix for now
    restart();
  }


  function load() {
    var data = _.filter( window.statements, function( d ) {
      return ( !( 'loaded' in d ) || !d.loaded );
    });

    if (!data) {
      return setTimeout(load, 2e3);
    }

      // load next three slices
    onLoad( data.slice(0, 3) );
  }
    

  function onLoad( data ) {
    data.loaded = true;

    if (data && voice) {
      preloadTTS( data, 0 );
    }
    
    _.each( data, function( d ) {
      var object = new Slide( d );

      var lastObject = _.last( cssScene.children );
      var lastZ = ( lastObject ) ? lastObject.position.z : 0;

      object.position.z = lastZ - 1000;
      cssScene.add( object );
    } );
  }


  function restart() {
    auto = true;
    camera.position.z = 0;
  }


//TODO: improve
  function playVoice( object ) {
    if (object.d.tts && !object.d.loaded) {
      console.log(object.d);
      $('audio').prop('src', object.d.tts)[0].play();
      object.d.loaded = true;
    }
  }


  function move( delta ) {
    var focal = 500;

    var camZ = camera.position.z;
    var newZ = camZ + delta;
    var focalZ = newZ - focal;
    var left = false;

    _.each( cssScene.children, function( object, i ) {
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

        if (object.d.image && delta < focal * 3) {
          object.element.style.backgroundImage = 'url('+object.d.image+')';
        }
        else {
          object.element.style.backgroundImage = 'none';
        }
      }

      if (voice && opacity > 0.3) {
        playVoice(object);
      }

      var newOpacity = Math.floor((opacity / 20) * 100) / 100;

      if (object.element.style.opacity !== newOpacity) {
        object.element.style.opacity = newOpacity;
        object.element.style.display = ( newOpacity ) ? 'flex' : 'none';
      }
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
    var width = window.innerWidth;
    var height = window.innerHeight;

    aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    cameraB.aspect = aspect;
    cameraB.updateProjectionMatrix();

    renderer.setSize( width, height );
    cssRenderer.setSize( width, height );
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
    //renderer.render( preloaderScene, cameraB );
    cssRenderer.render( cssScene, camera );

    stats.update();
  }

  init();
  animate();
  
  setInterval(load, 5e3);

})();