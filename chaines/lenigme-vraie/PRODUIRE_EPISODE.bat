@echo off
rem ======================================================================
rem  L'Enigme Vraie - production d'un episode avec le moteur de motion design
rem
rem  Usage :  PRODUIRE_EPISODE.bat 11_masque-de-fer
rem
rem  Prerequis (une seule fois) : Node 22+, Python 3, FFmpeg,
rem    npm install
rem    npm i -D playwright  puis  npx playwright install chromium
rem    pip install edge-tts numpy
rem
rem  Voix ElevenLabs (recommande) : definir ELEVENLABS_API_KEY (votre cle sk_...)
rem  et eventuellement VOIX_ELEVENLABS (defaut : Paul K, narrateur francais grave).
rem  Sans cle : voix edge-tts.
rem
rem  Optionnel : definir BUSINESS_TIKTOK pour ranger automatiquement les
rem  fichiers dans le dossier du business, par exemple :
rem    set BUSINESS_TIKTOK=C:\chemin\vers\BUSINESS TIKTOK
rem ======================================================================
setlocal
set EP=%~1
if "%EP%"=="" set EP=11_masque-de-fer
cd /d "%~dp0\..\.."
set SORTIE=chaines\lenigme-vraie\sortie\%EP%

if not defined VOIX_ELEVENLABS set VOIX_ELEVENLABS=5l4ttmr4SKNgi0HnOelT
set VOIXOPT=

echo [1/4] Storyboard, narration et fiche...
call npm run episode -- %EP% || goto :erreur

if defined ELEVENLABS_API_KEY (
  echo [voix] ElevenLabs, puis recalage du storyboard sur la vraie voix...
  python chaines\lenigme-vraie\audio\voix_elevenlabs.py "%SORTIE%" --voice-id %VOIX_ELEVENLABS% --vitesse 1.15 || goto :erreur
  call npm run episode -- %EP% || goto :erreur
  set VOIXOPT=--voix-dir "%SORTIE%\voix"
)

echo [2/4] Rendu video avec le moteur (mode Auto, aucune image perdue)...
node scripts\render.mjs "%SORTIE%\storyboard.json" "%SORTIE%\video.webm" --miniature 5.0 "%SORTIE%\miniature.jpg" || goto :erreur

echo [3/4] Musique originale et bruitages...
python chaines\lenigme-vraie\audio\musique.py "%SORTIE%" "%SORTIE%\musique.wav" || goto :erreur

echo [4/4] Voix, mixage et versions finales...
python chaines\lenigme-vraie\audio\ajouter_voix.py "%SORTIE%" --video "%SORTIE%\video.webm" --musique "%SORTIE%\musique.wav" --sortie "%SORTIE%\%EP%.mp4" --web %VOIXOPT% || goto :erreur

if defined BUSINESS_TIKTOK (
  echo Rangement dans "%BUSINESS_TIKTOK%"...
  copy /y "%SORTIE%\%EP%.mp4" "%BUSINESS_TIKTOK%\VIDEOS FINALISEES\%EP%.mp4" >nul
  copy /y "%SORTIE%\%EP%_web.mp4" "%BUSINESS_TIKTOK%\VIDEOS FINALISEES\version_telephone\%EP%_web.mp4" >nul
  copy /y "%SORTIE%\miniature.jpg" "%BUSINESS_TIKTOK%\MINIATURES\%EP%.jpg" >nul
  copy /y "%SORTIE%\fiche.md" "%BUSINESS_TIKTOK%\SCRIPTS\%EP%.md" >nul
)

echo.
echo Episode pret : %SORTIE%\%EP%.mp4
exit /b 0

:erreur
echo.
echo Echec de la production de %EP%.
exit /b 1
