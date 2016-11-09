#define _CRT_SECURE_NO_WARNINGS

#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cassert>
#include <cstring>

template <class TObj >
class TRelPointer {
  int32_t offset;
public:
  operator const TObj*() const {
    return static_cast<const TObj*>((const void*)((uint8_t*)this + offset));
  }
};


class TVar {
  
  typedef TRelPointer<TVar> TRelVar;


  enum eType {
    INVALID
    , STRING = 0x55555555
    , OBJECT = 0xBBBBBBBB
    , ARRAY = 0xAAAAAAAA
    , NUMBER_INT = 0x78563412
    , NUMBER_FLOAT = 0xFFAFFFAF
  };

public:

  class TObjectKey {
    TRelVar name_;
    TRelVar value_;
  public:
    const char* name() const { return name_.operator const TVar *()->asCString(); }
    const TVar* value() const { return value_.operator const TVar *(); }
  };

  class const_iterator {
    const TObjectKey* key_val;
  public:
    const_iterator(const TObjectKey* akey_val) : key_val(akey_val) { }
    bool operator!=(const const_iterator &other) const {
      return key_val != other.key_val;
    }
    bool operator==(const const_iterator &other) const {
      return key_val == other.key_val;
    }
    void operator++() {
      key_val++;
    }
    const TObjectKey* operator->() const {
      return key_val;
    }
  };

  TVar() : type_(INVALID) { }

  // Query types
  bool isObject() const { return type_ == OBJECT; }
  bool isArray()  const { return type_ == ARRAY; }
  bool isString() const { return type_ == STRING; }
  bool isInt()    const { return type_ == NUMBER_INT; }
  bool isFloat()  const { return type_ == NUMBER_FLOAT; }

  // Types
  eType type() const { return type_; }
  const char *type_c_str() const {
    if (type_ == STRING) return "string";
    else if (type_ == OBJECT) return "object";
    else if (type_ == ARRAY) return "array";
    else if (type_ == NUMBER_INT) return "int";
    else if (type_ == NUMBER_FLOAT) return "float";
    else return "invalid";
  }

  // Conversion to c++ types
  const char* asCString() const {
    assert(isString());
    return (const char*)data();
  }
  int32_t asInt() const {
    assert(isInt() || isFloat());
    return isInt()
      ? (*(int32_t*)data())
      : (int32_t)(*(float*)data())
      ;
  }
  float asFloat() const {
    assert(isInt() || isFloat());
    return isInt()
      ? (*(int32_t*)data())
      : (*(float*)data())
      ;
  }

  // Array access
  uint32_t size() const {
    assert(isArray() || isObject());
    return *(uint32_t*)data();
  }
  const TVar* operator[](uint32_t idx) const {
    assert(isArray());
    assert(idx < size());
    const void* offset = addr_of_array_item(idx);
    const TRelVar& p = *(const TRelVar*)offset;
    return p;
  }

  // Object access
  const char* key(uint32_t idx) const {
    assert(isObject());
    assert(idx < size());
    return addr_of_object_item(idx)->name();
  }
  const TVar* val(uint32_t idx) const {
    assert(isObject());
    assert(idx < size());
    return addr_of_object_item(idx)->value();
  }
  const TVar* operator[](const char* str) const {
    assert(isObject());
    for (uint32_t idx = size(); idx--; ) {
      const char* nth_key = key(idx);
      if (strcmp(str, nth_key) == 0)
        return val(idx);
    }
    return nullptr;
  }

  const_iterator begin() const {
    assert(isObject());
    return const_iterator(addr_of_object_item(0));
  }
  const_iterator end() const {
    assert(isObject());
    return const_iterator(addr_of_object_item(size()));
  }

  // Dump
  void dump( int level = 1) const {
    printf("%*s (%-8s)", level*2, " ", type_c_str());
    if (isString()) {
      const char* str = asCString();
      printf("%s\n", str);
    }
    else if (isInt()) {
      printf("%d\n", asInt());
    }
    else if (isFloat()) {
      printf("%f\n", asFloat());
    }
    else if (isArray()) {
      printf("  Array of %ld items\n", size());
      for (uint32_t i = 0; i < size(); ++i) {
        const TVar *item = (*this)[i];
        item->dump(level+1);
      }
    }
    else if (isObject()) {
      printf("  Object of %ld keys\n", size());
      auto it = begin();
      while (it != end()) {
        printf("%*s   %s\n", level * 2, " ", it->name());
        it->value()->dump(level + 1);
        ++it;
      }
    }
  }

private:
  static const int bytes_of_type = 4;
  static const int bytes_of_array_size = 4;
  static const int bytes_of_array_entry = 4;
  static const int bytes_of_object_entry = 8;
  const void *data() const { return ((const uint8_t*)this) + bytes_of_type; }
  const void* addr_of_array_item(uint32_t idx) const { 
    return ((const uint8_t*)this + (bytes_of_type + bytes_of_array_size + idx * bytes_of_array_entry));
  }
  const TObjectKey* addr_of_object_item(uint32_t idx) const {
    return (const TObjectKey*)((const uint8_t*)this + (bytes_of_type + bytes_of_array_size + idx * bytes_of_object_entry));
  }
  eType type_;

};


void *readFile(const char* infilename) {
  FILE *f = fopen(infilename, "rb");
  if (!f)
    return nullptr;
  fseek(f, 0, SEEK_END);
  auto nbytes = ftell(f);
  fseek(f, 0, SEEK_SET);
  void *data = malloc(nbytes);
  fread(data, 1, nbytes, f);
  fclose(f);
  return data;
}



int main(int argc, char** argv) {
  const char* infilename = "../json2jbin/sample1.jbin";
  if (argc > 1)
    infilename = argv[1];
  void* buf = readFile(infilename);
  if (!buf)
    return -1;
  
  TVar* v = (TVar*) buf;
  v->dump();

  free(buf);
}