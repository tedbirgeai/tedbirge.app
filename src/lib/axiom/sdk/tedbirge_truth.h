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

#ifdef __cplusplus
extern "C" {
#endif

#define TB_TRUTH_ABI_VERSION 1
#define TB_TRUTH_SOCKET_PATH "/run/tedbirge/tedbirge_truth.sock"
#define TB_TRUTH_WSS_URL "wss://tedbirge.dev/ws"

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

typedef struct tb_proof_t {
  tb_verdict_t verdict;
  tb_engine_t engine;
  int wasmVerified; /* 1 = Z3/Lean ikilisiyle dogrulandi */
  uint32_t ms;      /* harcanan sure */
  char cid[65];     /* icerik kimligi (hex, NUL sonlu) */
  char seal[129];   /* TEDBIRGE-WEBOS-ZKP muhru; bos = muhur yok */
} tb_proof_t;

/* Kopruyu acar. socket_path NULL ise TB_TRUTH_SOCKET_PATH kullanilir. */
tb_truth_handle *tb_truth_open(const char *socket_path, tb_status_t *out_status);

/* Bir onermeyi dogrular. text UTF-8 ve NUL sonlu olmalidir. */
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
