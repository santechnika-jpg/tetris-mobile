# Tetris Mobile

Mobiliai pritaikytas Tetris žaidimas, skirtas atidaryti telefone per naršyklę.

## Paleidimas kompiuteryje

```bash
cd /workspace/tetris-mobile
python -m http.server 4173
```

Tada kompiuteryje atidaryk:

```text
http://127.0.0.1:4173/
```

## Paleidimas Samsung telefone

Telefonas ir kompiuteris turi būti tame pačiame Wi-Fi tinkle.

1. Kompiuteryje sužinok vietinį IP adresą.
2. Telefono naršyklėje atidaryk:

```text
http://KOMPIUTERIO-IP:4173/
```

Pavyzdys:

```text
http://192.168.1.20:4173/
```

Chrome naršyklėje gali pasirinkti **Add to Home screen**, kad žaidimas atsirastų telefono pradžios ekrane.

## Valdymas

- Dideli mygtukai apačioje: judinti į kairę/dešinę, leisti žemyn, pasukti ir nuleisti.
- Laikyk nuspaudęs `←`, `→` arba `↓`, kad veiksmas kartotųsi.
- Ant lentos: bakstelėk, kad pasuktum figūrą; brauk į kairę/dešinę, kad pastumtum; brauk žemyn, kad paleistum žemyn.
- `Nuleisti`: greitai numesti figūrą iki apačios.
- `Pauzė`: sustabdyti arba tęsti žaidimą.
- `Iš naujo`: pradėti naują žaidimą.
