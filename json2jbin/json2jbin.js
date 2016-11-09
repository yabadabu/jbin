var murmur3 = require( './murmur3')
var fs = require( 'fs')

function pack( ) {
  var fmt = arguments[0];
  var nargs_required = fmt.length;
  var nargs_received = Object.keys( arguments ).length;
  var buf = new Buffer( 0 );
  var sbuf = new Buffer( 4 );     // To store integer, floats, etc

  if( nargs_received < nargs_required )
    throw ("Need " + nargs_required + " to pack with format " + fmt + " but only received " + nargs_received );

  var offset = 0;
  for( var c = 1; c < nargs_received; ++c ) {
    var narg = c;
    var a = arguments[narg];
    if( a === undefined )
      throw ( "Null received as argument " + narg + " when using fmt " + fmt )
    //console.log( "Arg at " + narg+ " is " + a );
    var nbuf = sbuf;
    var f = fmt[c-1];
    if( f == 'U' ) {
      sbuf.writeUInt32LE( a  )
    } else if( f == 'F' ) {
      sbuf.writeFloatLE( a  )
    } else if( f == 'S' ) {
      nbuf = new Buffer( a.length + 1);
      nbuf.write( a );
      nbuf.writeInt8( 0, a.length );
    } else {
      throw ( "Invalid character " + f+ " at offset " + c + " of format " + fmt);
    }
    buf = Buffer.concat( [ buf, nbuf ] );
  }
  return buf;
}

function singleArrayOfBuffers( obj ) {
  if( Buffer.isBuffer( obj ) ) 
    return [obj];

  var p = []

  for( var q in obj ) {
    if( Buffer.isBuffer( obj[q] ) ) {
      p.push( obj[q] );
    }
    else {
      var sub_arrays = singleArrayOfBuffers( obj[q] );
      p = p.concat( sub_arrays );
    }
  }
  return p;
}


function bufferSize( b ) {
  var q = singleArrayOfBuffers( b );
  var n = 0;
  for( var idx in q ) {
    n += q[idx].length;
  }
  return n;
}

function isFloat(n){
  return n === Number(n) && n % 1 !== 0;
}

function isInt(mixed_var) {
  return mixed_var === +mixed_var && isFinite(mixed_var) && !(mixed_var % 1);
}

function serializeStringToBuffer( obj ) {
  return pack( "US", 0x55555555, obj );
}

function serializeNumberToBuffer( obj ) {
  if( isInt(obj) )
    return pack( "UU", 0x78563412, obj );
  else if( isFloat(obj))
    return pack( "UF", 0xFFAFFFAF, obj );
}

function serializeArrayToBuffer( obj ) {
  var header = pack( "UU", 0xAAAAAAAA, obj.length );
  var datas = [];
  for( var i in obj ) {
    datas.push( serializeToBuffer( obj[i] ) );
  }

  var offsets = [];
  var acc_datas = datas.length * 4;
  for( var i in obj ) {
    var my_offset = i * 4;
    var my_data_offset = acc_datas;
    offsets.push( pack( "U", my_data_offset - my_offset ));
    var bsize = bufferSize( datas[ i ] );
    acc_datas += bufferSize( datas[ i ] );
  }

  return [ header ].concat( offsets ).concat( datas );
}

function serializeObjectToBuffer( obj ) {
  var keys = Object.keys( obj );
  var header = pack( "UU", 0xBBBBBBBB, keys.length );
  var datas = [];
  for( var i in keys ) {
    datas.push( serializeToBuffer( obj[keys[i]] ) );
  }

  var bytes_in_object_dict_entry = 8;   // 4 for the offset to the name + 4 for the offset to the data
  var total_bytes_in_keys = 0;
  var key_names = [];
  for( var i in keys ) {
    key_names.push( serializeStringToBuffer( keys[i] ));
    total_bytes_in_keys += key_names[i].length;
  }

  var offsets = [];
  var acc_keys = keys.length * bytes_in_object_dict_entry;
  var acc_datas = keys.length * bytes_in_object_dict_entry + total_bytes_in_keys;
  for( var i in keys ) {
    var my_offset = i * 8;
    var my_key_offset = acc_keys;
    var my_data_offset = acc_datas;
    offsets.push( pack( "UU", my_key_offset - my_offset, my_data_offset - my_offset - 4));
    acc_datas += bufferSize( datas[ i ] );
    acc_keys += key_names[ i ].length;
  }

  return [ header ].concat( offsets ).concat( key_names ).concat( datas );
}

function serializeToBuffer( obj ) {

  if( typeof obj == "string" ) {

    return serializeStringToBuffer( obj );

  } else if( typeof obj == "number" ) {

    return serializeNumberToBuffer( obj );

  } else if( typeof obj == "object" ) {

    if( obj instanceof Array) {
    
      return serializeArrayToBuffer( obj );

    } else {

      return serializeObjectToBuffer( obj );

    }

  }

}

// ---------------------- Check args
var in_file;
var out_file;
var dump_output = false;
for( var k=2; k<process.argv.length; ++k ) {
  var arg = process.argv[ k ];
  if( arg == '-d') {
    dump_output = true;
  } else if( !in_file ) {
    in_file = arg;
  } else {
    out_file = arg;
  }
}

// ---------------------- read args
if( !in_file || !out_file ) {
  console.log( "Usage: node " + process.argv[1] + " [-v] <in_file.json> <out_file.jbin> " );
  process.exit( -1 )
}
var in_data = fs.readFileSync( in_file );
var in_json;
try {
  in_json = JSON.parse( in_data );
} catch( err ) {
  throw( "Invalid json found in file " + in_file );
}

// ---------------------- convert to array of buffers
var buf = serializeToBuffer( in_json );

// ---------------------- flat into a single buffer
var buffers = singleArrayOfBuffers( buf );

if( dump_output )
  console.log( buffers );

var sbuf = Buffer.concat( buffers );

// ---------------------- Save output
fs.writeFile( out_file, sbuf, ( err ) => {
  if( err )
    throw err;
  console.log( "Save to " + sbuf.length + " bytes");
  process.exit( 0 );
});



/*

// -----------------------------------------------------
var obj = {
  "magic":0x55667788,
  "duration": 4.0,
  "version": 0x01,
  "tracks": {
    "eye_L": [
      { "center":0. },
      { "right":1.2 },
      { "left":2. },
    ],
    "eye_R": [
      { "center":0. },
      { "right":1.0 },
      { "middle":1.5 },
      { "left":3. },
    ],
  }
};

//var b = serializeToBuffer( [[1,2,3],4] );
//var b = serializeToBuffer( [1,4] );
//var b = serializeToBuffer( obj );
//var b = [serializeToBuffer( [{"john":2},3] ) ];
//var b = [serializeToBuffer( [{"john":2},3] ) ];
var b = [serializeToBuffer( {"john":2,"peter":3,"javier":[1,2,3]} ) ];
console.log( b );

var buffers = singleArrayOfBuffers( b );
//console.log( buffers );
var sbuf = Buffer.concat( buffers );
fs.writeFile( "in.bin", sbuf, function( err ) {
  console.log( sbuf.length + " bytes");
});

*/