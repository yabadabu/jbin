# jbin
Convert a json to a binary format which can be mapped to c++ without doing any allocation

There are many times when you need to have some type of read-only heterogeneous data. In those
cases json format is a good fit. Parsing a json in c++ is easy, but takes some time and memory, 
normally translated to multiples allocations calls.
The proposed format is just another binary format of a json, which has the benefit that you 
just need the file in memory, and just from the addr, you can query/navigate which kind of json
data you are pointing at, read children, etc.

This project provides a sample conversion tool to convert a .json into a .jbin file, then 
a .cpp file reads the file in a single call, and dumps the contents to console.

To generate a .jbin from a .json file using the conversion tool written in js.
```
$ node json2jbin.js -d sample1.json sample1.jbin
```

sample1.json:
```
{"name":"john","tape":3,"langs":["es","en","ca"]}
```

sample1.jbin: (as output from the node console)
```
[ <Buffer bb bb bb bb 03 00 00 00>,
  <Buffer 18 00 00 00 30 00 00 00>,
  <Buffer 19 00 00 00 31 00 00 00>,
  <Buffer 1a 00 00 00 31 00 00 00>,
  <Buffer 55 55 55 55 6e 61 6d 65 00>,
  <Buffer 55 55 55 55 74 61 70 65 00>,
  <Buffer 55 55 55 55 6c 61 6e 67 73 00>,
  <Buffer 55 55 55 55 6a 6f 68 6e 00>,
  <Buffer 12 34 56 78 03 00 00 00>,
  <Buffer aa aa aa aa 03 00 00 00>,
  <Buffer 0c 00 00 00>,
  <Buffer 0f 00 00 00>,
  <Buffer 12 00 00 00>,
  <Buffer 55 55 55 55 65 73 00>,
  <Buffer 55 55 55 55 65 6e 00>,
  <Buffer 55 55 55 55 63 61 00> ]
Save to 118 bytes
```

Read the file from a c++ (see the source)
Expected output:
```
   (object  )  Object of 3 keys
     name
     (string  )john
     tape
     (int     )3
     langs
     (array   )  Array of 3 items
       (string  )es
       (string  )en
       (string  )ca
```
