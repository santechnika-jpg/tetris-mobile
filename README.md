# Tetris Runner

Mobiliai pritaikytas Tetris ir platformerio mišinys. Figūros krenta automatiškai, užsirakina kaip platformos, o tu valdai žmogutį, kuris bėga ir šokinėja tarp blokų.

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

- `←`: bėgti į kairę.
- `→`: bėgti į dešinę.
- `Šokti`: pašokti nuo žemės arba nuo užrakintos figūros.
- Ant lentos: laikyk kairį trečdalį, kad bėgtum kairėn; dešinį trečdalį, kad bėgtum dešinėn; vidurį, kad šoktum.
- `Pauzė`: sustabdyti arba tęsti žaidimą.
- `Iš naujo`: pradėti naują žaidimą.

Jei krentanti figūra paliečia žmogutį, žaidimas baigiasi. Užrakintos figūros tampa platformomis.
