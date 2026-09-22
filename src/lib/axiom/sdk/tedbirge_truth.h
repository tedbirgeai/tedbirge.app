/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM(TM) is a proprietary product and core engine of Tedbirge WebOS.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app
 *
 * TEDBIRGE TRUTH BRIDGE - C ABI (v1)
 * -----------------------------------------------------------------
 * Masaustu / bare-metal ortaminda AXIOM dogrulama cekirdegine
 * /run/tedbirge/tedbirge_truth.sock Unix alan soketi uzerinden
 * baglanir. Tarayici ortaminda bu ABI kullanilamaz; istemci
 * otomatik olarak wss://tedbirge.dev/ws yedegine gecer.
 *
 * Cerceve: her istek ve yanit tek satir JSON, '\n' ile ayrilir.
 * Istek : {"id":1,"method":"axiom.verify","text":"..."}
 * Yanit : {"id":1,"verdict":"200_PROVEN","engine":"z3",
 *          "wasmVerified":true,"ms":12,"cid":"...","seal":"..."}
 *
 * Girdi metni hicbir yere yazilmaz / gunluklenmez.
 */

#ifndef TEDBIRGE_TRUTH_H
#define TEDBIRGE_TRUTH_H

#include <stddef.h>
#include <stdint.h>
#include <pthread.h>

#ifdef __cplusplus
extern "C" {
#endif

#define TB_TRUTH_ABI_VERSION 1
#define TB_TRUTH_SOCKET_PATH "/run/tedbirge/tedbirge_truth.sock"
#define TB_TRUTH_WSS_URL "wss://tedbirge.dev/ws"

/* Kopru cok is parcacikli cagrilara karsi kilit altindadir. */
#define TB_TRUTH_THREAD_SAFE 1

/* Sert zaman butcesi: her dogrulama en cok bu kadar surebilir. */
#define TB_TRUTH_TIMEOUT_MS 500


/* Karar kodlari AXIOM cekirdegiyle birebir aynidir. */
typedef enum tb_verdict_t {
  TB_VERDICT_PROVEN = 200,            /* 200_PROVEN */
  TB_VERDICT_REFUTED = 409,           /* 409_REFUTED */
  TB_VERDICT_UNDECIDED = 422,         /* 422_UNDECIDED */
  TB_VERDICT_EXECUTION_TIMEOUT = 504, /* 504_EXECUTION_TIMEOUT */
  TB_VERDICT_PANIC = 500              /* 500_PANIC */
} tb_verdict_t;

typedef enum tb_engine_t {
  TB_ENGINE_LOCAL = 0, /* Yerel kural kapisi */
  TB_ENGINE_Z3 = 1,
  TB_ENGINE_LEAN4 = 2
} tb_engine_t;

typedef enum tb_status_t {
  TB_OK = 0,
  TB_ERR_NO_SOCKET = -1,  /* soket bulunamadi (masaustu servisi kapali) */
  TB_ERR_TIMEOUT = -2,    /* 500 ms asildi */
  TB_ERR_PROTOCOL = -3,   /* bozuk cerceve */
  TB_ERR_CLOSED = -4,     /* baglanti kapandi */
  TB_ERR_ABI = -5         /* ABI surumu uyusmuyor */
} tb_status_t;

typedef struct tb_truth_handle tb_truth_handle;

/* BELLEK DUZENI (memory layout)
 * -----------------------------------------------------------------
 * Alanlar 4-bayt hizali yerlestirilir; cid[65] + seal[129] = 194 bayt
 * karakter dizisi tek basina 2 baytlik ortu (padding) gerektirdiginden
 * bu dolgu ACIK olarak bildirilir. Boylece derleyiciye birakilan
 * ortuk dolgu ve WebAssembly (wasm32) tarafiyla olusabilecek kayma
 * tamamen ortadan kalkar.
 *
 *   verdict  4 | engine 4 | wasmVerified 4 | ms 4  =  16
 *   cid     65 | seal  129                         = 194
 *   _pad     2                                     =   2
 *   TOPLAM  212 bayt (dogal 4-bayt siniri)
 */
typedef struct tb_proof_t {
  tb_verdict_t verdict;
  tb_engine_t engine;
  int wasmVerified; /* 1 = Z3/Lean ikilisiyle dogrulandi */
  uint32_t ms;      /* harcanan sure */
  char cid[65];     /* icerik kimligi (hex, NUL sonlu) */
  char seal[129];   /* TEDBIRGE-WEBOS-ZKP muhru; bos = muhur yok */
  uint8_t _pad[2];  /* ACIK dolgu — 212 bayt hizalamasini sabitler */
} tb_proof_t;

/* Yapi boyutu derleme aninda kilitlenir: kayma sessizce gecemez. */
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L
_Static_assert(sizeof(tb_proof_t) == 212, "tb_proof_t 212 bayt olmalidir");
_Static_assert(_Alignof(tb_proof_t) == 4, "tb_proof_t 4-bayt hizali olmalidir");
#endif


/* OLAY KANCALARI (event-driven interrupts)
 * -----------------------------------------------------------------
 * Sistem tarafi beklenmedik durumlari kendiliginden bildirir; istemci
 * dongu icinde hicbir sey sorgulamaz. Sinyal isleyicisi yalniz olayi
 * kuyruga koyar: icinde tahsis, yazma veya gunlukleme YAPILMAZ.
 */
typedef enum tb_event_kind_t {
  TB_EVENT_CONNECTED = 0,
  TB_EVENT_DISCONNECTED = 1,
  TB_EVENT_MEMORY_FAULT = 2, /* SIGSEGV / SIGBUS */
  TB_EVENT_OUT_OF_MEMORY = 3,
  TB_EVENT_HARDWARE = 4,
  TB_EVENT_TIMEOUT = 5,
  TB_EVENT_CLOSED = 6
} tb_event_kind_t;

typedef enum tb_event_severity_t {
  TB_SEVERITY_INFO = 0,
  TB_SEVERITY_WARN = 1,
  TB_SEVERITY_ERROR = 2
} tb_event_severity_t;

/* BELLEK DUZENI
 *   kind 4 | severity 4 | ms 4  =  12
 *   code  33 | note 129         = 162
 *   _pad   2                    =   2
 *   TOPLAM 176 bayt (dogal 4-bayt siniri)
 */
typedef struct tb_event_t {
  tb_event_kind_t kind;
  tb_event_severity_t severity;
  uint32_t ms;     /* olay ani (surec baslangicindan beri, ms) */
  char code[33];   /* ham sistem kodu (NUL sonlu), arayuzde gosterilmez */
  char note[129];  /* sade Turkce aciklama (NUL sonlu) */
  uint8_t _pad[2]; /* ACIK dolgu — 176 bayt hizalamasini sabitler */
} tb_event_t;

#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L
_Static_assert(sizeof(tb_event_t) == 176, "tb_event_t 176 bayt olmalidir");
_Static_assert(_Alignof(tb_event_t) == 4, "tb_event_t 4-bayt hizali olmalidir");
#endif

/* Olay kancasi. Kanca sinyal baglaminda cagrilabilir: yalniz kopyalama
 * ve kuyruga yazma yapmalidir. Girdi metni asla tasinmaz. */
typedef void (*tb_event_cb)(const tb_event_t *event, void *user);

/* Kancayi kaydeder. cb NULL ise kanca kaldirilir (sorgulama yoktur). */
tb_status_t tb_truth_set_event_cb(tb_truth_handle *handle, tb_event_cb cb, void *user);


/* Kopruyu acar. socket_path NULL ise TB_TRUTH_SOCKET_PATH kullanilir. */
tb_truth_handle *tb_truth_open(const char *socket_path, tb_status_t *out_status);

/* Bir onermeyi dogrular. text UTF-8 ve NUL sonlu olmalidir. */
/* ESZAMANLILIK KILIDI
 * -----------------------------------------------------------------
 * Tek soket uzerinde birden fazla is parcacigi dogrulama isteyebilir.
 * Cerceve karisikligini onlemek icin tutamac icinde bir mutex tasinir;
 * tb_truth_verify cagrisi istegi yazmadan once kilidi alir, yanit
 * cozuldukten (veya TB_TRUTH_TIMEOUT_MS asildiktan) sonra birakir.
 * Kilit tb_truth_open icinde kurulur, tb_truth_close icinde yikilir.
 *
 *   pthread_mutex_t io_lock;  (tutamacin ic alani)
 *
 * Kilidi dogrudan yonetmek isteyen gomulu istemciler icin asagidaki
 * iki cagri aciga alinmistir; normal kullanimda gerekmez.
 */
tb_status_t tb_truth_lock(tb_truth_handle *handle);
tb_status_t tb_truth_unlock(tb_truth_handle *handle);

/* Kilidin kurulu ve etkin oldugunu bildirir (1 = etkin). */
int tb_truth_lock_active(const tb_truth_handle *handle);

/* Bir onermeyi dogrular. text UTF-8 ve NUL sonlu olmalidir.
 * Cagri is parcacigi guvenlidir: icte io_lock kilidi altinda yurur. */
tb_status_t tb_truth_verify(tb_truth_handle *handle, const char *text, tb_proof_t *out_proof);

/* Son hatanin insan okunur aciklamasi (girdi metni icermez). */
const char *tb_truth_last_error(tb_truth_handle *handle);


/* ABI uyumu denetimi: cagiran TB_TRUTH_ABI_VERSION gecirir. */
tb_status_t tb_truth_check_abi(uint32_t abi_version);

/* Kopruyu kapatir ve tum kaynaklari serbest birakir. */
void tb_truth_close(tb_truth_handle *handle);

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* TEDBIRGE_TRUTH_H */
