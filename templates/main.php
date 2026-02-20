<?php
/** @var \OCP\IL10N $l */
/** @var array $_ */
$isAdmin = $_['isAdmin'] ?? false;
?>

<div id="app">

    <!-- ══════════════════════════════════════
         SIDEBAR
    ══════════════════════════════════════ -->
    <div id="app-navigation">

        <div class="app-navigation-new">
            <button class="nc-btn nc-btn-primary btn-full"
                    onclick="PerfAvion.newAircraft()">
                + Nouvel avion
            </button>
        </div>

        <!-- La liste est rendue par JS, mais on injecte isAdmin en data-attr -->
        <ul id="aircraft-list"
            data-is-admin="<?php echo $isAdmin ? '1' : '0'; ?>">
        </ul>

        <div id="app-settings">
            <div id="app-settings-header">
                <button class="settings-button" onclick="PerfAvion.toggleSettings()">
                    Paramètres
                </button>
            </div>
            <div id="app-settings-content">
                <p class="settings-hint">
                    Données sauvegardées dans votre navigateur.
                </p>
                <button class="nc-btn nc-btn-tertiary btn-full"
                        onclick="PerfAvion.exportData()">
                    ⬇ Exporter JSON
                </button>
                <label class="nc-btn nc-btn-tertiary btn-full lbl-import">
                    ⬆ Importer JSON
                    <input type="file" accept=".json"
                           onchange="PerfAvion.importData(this)">
                </label>
            </div>
        </div>

    </div>

    <!-- ══════════════════════════════════════
         CONTENU PRINCIPAL
    ══════════════════════════════════════ -->
    <div id="app-content">
        <div id="app-content-wrapper">

            <!-- Toolbar -->
            <div id="perfavion-toolbar">
                <span id="toolbar-aircraft-name">—</span>
                <div id="toolbar-actions">
                    <button class="nc-btn nc-btn-tertiary"
                            onclick="PerfAvion.resetFields()">↺ Réinitialiser</button>
                    <button class="nc-btn nc-btn-primary"
                            onclick="PerfAvion.calculate()">▶ Calculer</button>
                </div>
            </div>

            <!-- Grille 3 colonnes : saisie | résultats | CG -->
            <div id="perfavion-grid">

                <!-- COL 1 : SAISIE -->
                <div class="col-input">

                    <div class="nc-card">
                        <div class="nc-card__body">
                            <div class="nc-subsection">Masses — Chargement</div>
                            <div class="field-group">
                                <div class="field-row">
                                    <span class="field-row__label">Masse à vide</span>
                                    <div class="field-row__input">
                                        <input type="number" id="m_empty" class="nc-input nc-input-sm" placeholder="—" step="1">
                                        <span class="field-row__unit">kg</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Pilote</span>
                                    <div class="field-row__input">
                                        <input type="number" id="m_pilot" class="nc-input nc-input-sm" value="80" step="1">
                                        <span class="field-row__unit">kg</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Passager avant</span>
                                    <div class="field-row__input">
                                        <input type="number" id="m_pax_f" class="nc-input nc-input-sm" value="0" step="1">
                                        <span class="field-row__unit">kg</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Passager arrière 1</span>
                                    <div class="field-row__input">
                                        <input type="number" id="m_pax_r1" class="nc-input nc-input-sm" value="0" step="1">
                                        <span class="field-row__unit">kg</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Passager arrière 2</span>
                                    <div class="field-row__input">
                                        <input type="number" id="m_pax_r2" class="nc-input nc-input-sm" value="0" step="1">
                                        <span class="field-row__unit">kg</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Bagages</span>
                                    <div class="field-row__input">
                                        <input type="number" id="m_baggage" class="nc-input nc-input-sm" value="0" step="1">
                                        <span class="field-row__unit">kg</span>
                                    </div>
                                </div>
                                <div class="nc-divider"></div>
                                <div class="field-row">
                                    <span class="field-row__label">Carburant départ</span>
                                    <div class="field-row__input">
                                        <input type="number" id="fuel_dep" class="nc-input nc-input-sm" value="120" step="1" oninput="PerfAvion.updateFuelKg()">
                                        <span class="field-row__unit">L</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Délestage en vol</span>
                                    <div class="field-row__input">
                                        <input type="number" id="fuel_burn" class="nc-input nc-input-sm" value="40" step="1">
                                        <span class="field-row__unit">L</span>
                                    </div>
                                </div>
                                <p class="text-sm mt-2" id="fuel_mass_info">≈ — kg</p>
                            </div>
                        </div>
                    </div>

                    <div class="nc-card">
                        <div class="nc-card__body">
                            <div class="nc-subsection">Météo &amp; Terrain</div>
                            <div class="field-group">
                                <div class="field-row">
                                    <span class="field-row__label">Altitude terrain</span>
                                    <div class="field-row__input">
                                        <input type="number" id="alt_terrain" class="nc-input nc-input-sm" value="0" step="10">
                                        <span class="field-row__unit">ft</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Température</span>
                                    <div class="field-row__input">
                                        <input type="number" id="temp" class="nc-input nc-input-sm" value="15" step="1">
                                        <span class="field-row__unit">°C</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">QNH</span>
                                    <div class="field-row__input">
                                        <input type="number" id="qnh" class="nc-input nc-input-sm" value="1013" step="1">
                                        <span class="field-row__unit">hPa</span>
                                    </div>
                                </div>
                                <div class="nc-divider"></div>
                                <div class="field-row">
                                    <span class="field-row__label">Direction vent</span>
                                    <div class="field-row__input">
                                        <input type="number" id="wind_dir" class="nc-input nc-input-sm" value="0" min="0" max="360" step="1">
                                        <span class="field-row__unit">°</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Vitesse vent</span>
                                    <div class="field-row__input">
                                        <input type="number" id="wind_spd" class="nc-input nc-input-sm" value="0" step="1">
                                        <span class="field-row__unit">kt</span>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">QFU piste</span>
                                    <div class="field-row__input">
                                        <input type="number" id="qfu" class="nc-input nc-input-sm" value="0" min="0" max="360" step="1">
                                        <span class="field-row__unit">°</span>
                                    </div>
                                </div>
                                <div class="nc-divider"></div>
                                <div class="field-row">
                                    <span class="field-row__label">Piste</span>
                                    <div class="field-row__input">
                                        <div class="nc-toggle">
                                            <input type="radio" name="rw_wet" id="rw_dry" value="dry" checked>
                                            <label for="rw_dry">Sèche</label>
                                            <input type="radio" name="rw_wet" id="rw_wet" value="wet">
                                            <label for="rw_wet">Mouillée</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Surface</span>
                                    <div class="field-row__input">
                                        <div class="nc-toggle">
                                            <input type="radio" name="rw_surf" id="rs_paved" value="paved" checked>
                                            <label for="rs_paved">Revêtue</label>
                                            <input type="radio" name="rw_surf" id="rs_grass" value="grass">
                                            <label for="rs_grass">Herbe</label>
                                        </div>
                                    </div>
                                </div>
                                <div class="field-row">
                                    <span class="field-row__label">Humidité</span>
                                    <div class="field-row__input">
                                        <div class="nc-toggle">
                                            <input type="radio" name="humidity" id="hum_norm" value="normal" checked>
                                            <label for="hum_norm">Normale</label>
                                            <input type="radio" name="humidity" id="hum_high" value="high">
                                            <label for="hum_high">Élevée</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div><!-- /col-input -->

                <!-- COL 2 : RÉSULTATS NUMÉRIQUES -->
                <div class="col-results">

                    <div class="nc-card">
                        <div class="nc-card__body">
                            <div class="nc-subsection">Masses</div>
                            <div class="result-list">
                                <div class="result-item result-item--accent">
                                    <span class="result-item__label">Masse décollage</span>
                                    <span class="result-item__value" id="r_mtow">—<span class="u">kg</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">MZF</span>
                                    <span class="result-item__value" id="r_mzf">—<span class="u">kg</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">Masse atterrissage</span>
                                    <span class="result-item__value" id="r_mlanding">—<span class="u">kg</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">Carburant arrivée</span>
                                    <span class="result-item__value" id="r_fuel_arr">—<span class="u">L</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">MTOW limite</span>
                                    <span class="result-item__value" id="r_mtow_limit" style="color:var(--color-text-maxcontrast);">—<span class="u">kg</span></span>
                                </div>
                                <div class="result-item" id="mtow_status_row">
                                    <span class="result-item__label">Statut masse</span>
                                    <span id="mtow_badge">—</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="nc-card">
                        <div class="nc-card__body">
                            <div class="nc-subsection">Atmosphère</div>
                            <div class="result-list">
                                <div class="result-item">
                                    <span class="result-item__label">Vent composante</span>
                                    <span class="result-item__value" id="r_wind_comp">—</span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">Vent traversier</span>
                                    <span class="result-item__value" id="r_xwind">—<span class="u">kt</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">Alt. pression</span>
                                    <span class="result-item__value" id="r_press_alt">—<span class="u">ft</span></span>
                                </div>
                                <div class="result-item result-item--accent">
                                    <span class="result-item__label">Alt. densité</span>
                                    <span class="result-item__value" id="r_dens_alt">—<span class="u">ft</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">Écart ISA</span>
                                    <span class="result-item__value" id="r_isa_dev">—<span class="u">°C</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="nc-card">
                        <div class="nc-card__body">
                            <div class="nc-subsection">Performances piste</div>
                            <div class="result-list">
                                <div class="result-item">
                                    <span class="result-item__label">Roulement décollage</span>
                                    <span class="result-item__value" id="r_todr">—<span class="u">m</span></span>
                                </div>
                                <div class="result-item result-item--accent">
                                    <span class="result-item__label">Décollage 50 ft</span>
                                    <span class="result-item__value" id="r_tod">—<span class="u">m</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">Roulement atterr.</span>
                                    <span class="result-item__value" id="r_ldr">—<span class="u">m</span></span>
                                </div>
                                <div class="result-item result-item--accent">
                                    <span class="result-item__label">Atterrissage 50 ft</span>
                                    <span class="result-item__value" id="r_ld">—<span class="u">m</span></span>
                                </div>
                            </div>
                            <p class="text-sm mt-2">⚠ Modélisation générique — consulter le manuel de vol.</p>
                        </div>
                    </div>

                </div><!-- /col-results -->

                <!-- COL 3 : MASSE & CENTRAGE -->
                <div class="col-cg">

                    <div class="nc-card" style="height:100%;">
                        <div class="nc-card__body">
                            <div class="nc-subsection">Masse &amp; Centrage</div>

                            <div class="canvas-wrap">
                                <canvas id="cgCanvas"></canvas>
                            </div>

                            <div class="cg-results">
                                <div class="result-item">
                                    <span class="result-item__label">CG décollage</span>
                                    <span class="result-item__value" id="r_cg_to">—<span class="u">mm</span></span>
                                </div>
                                <div class="result-item">
                                    <span class="result-item__label">CG atterrissage</span>
                                    <span class="result-item__value" id="r_cg_arr">—<span class="u">mm</span></span>
                                </div>
                                <div class="result-item" id="cg_status_row">
                                    <span class="result-item__label">Statut centrage</span>
                                    <span id="cg_badge">—</span>
                                </div>
                            </div>

                        </div>
                    </div>

                </div><!-- /col-cg -->

            </div><!-- /#perfavion-grid -->
        </div>
    </div><!-- /#app-content -->

</div><!-- /#app -->

<!-- MODAL CONFIGURATION -->
<div class="modal-overlay" id="configModal">
    <div class="modal">
        <div class="modal__head">
            <h2 id="modal_title">Configuration — Avion</h2>
            <button class="modal__close" onclick="PerfAvion.closeModal()">✕</button>
        </div>

        <div class="nc-tabs">
            <div class="nc-tab active" onclick="PerfAvion.switchTab('tab-general')">Général</div>
            <div class="nc-tab" onclick="PerfAvion.switchTab('tab-arms')">Bras de levier</div>
            <div class="nc-tab" onclick="PerfAvion.switchTab('tab-envelope')">Enveloppe CG</div>
            <div class="nc-tab" onclick="PerfAvion.switchTab('tab-perf')">Perfs de base</div>
        </div>

        <div class="tab-content active" id="tab-general">
            <div class="field-group">
                <div class="field-row"><span class="field-row__label">Nom / Immatriculation</span>
                    <input type="text" id="cfg_name" class="nc-input" style="width:200px;" placeholder="F-GABC"></div>
                <div class="field-row"><span class="field-row__label">Masse à vide (kg)</span>
                    <input type="number" id="cfg_empty" class="nc-input nc-input-sm" step="0.1"></div>
                <div class="field-row"><span class="field-row__label">MTOW (kg)</span>
                    <input type="number" id="cfg_mtow" class="nc-input nc-input-sm" step="1"></div>
                <div class="field-row"><span class="field-row__label">MZF max (kg)</span>
                    <input type="number" id="cfg_mzf" class="nc-input nc-input-sm" step="1"></div>
                <div class="field-row"><span class="field-row__label">Capacité carburant (L)</span>
                    <input type="number" id="cfg_fuel_max" class="nc-input nc-input-sm" step="1"></div>
                <div class="field-row"><span class="field-row__label">Densité carburant (kg/L)</span>
                    <input type="number" id="cfg_fuel_density" class="nc-input nc-input-sm" step="0.001" value="0.72"></div>
            </div>
        </div>

        <div class="tab-content" id="tab-arms">
            <p class="text-muted" style="margin-bottom:10px;">Bras de levier (mm) depuis le datum de référence.</p>
            <table class="nc-table">
                <thead><tr><th>Poste</th><th>Lié à</th><th>Bras (mm)</th><th></th></tr></thead>
                <tbody id="armsTbody"></tbody>
            </table>
            <button class="nc-btn nc-btn-secondary mt-3" onclick="PerfAvion.addArmRow()">+ Ajouter</button>
        </div>

        <div class="tab-content" id="tab-envelope">
            <p class="text-muted" style="margin-bottom:10px;">Limites avant/arrière du CG par palier de masse.</p>
            <table class="nc-table">
                <thead><tr><th>#</th><th>Masse (kg)</th><th>Avant (mm)</th><th>Arrière (mm)</th><th></th></tr></thead>
                <tbody id="envTbody"></tbody>
            </table>
            <button class="nc-btn nc-btn-secondary mt-3" onclick="PerfAvion.addEnvRow()">+ Ajouter</button>
        </div>

        <div class="tab-content" id="tab-perf">
            <p class="text-muted" style="margin-bottom:10px;">Distances de référence ISA, niveau de la mer, MTOW, piste sèche, vent nul.</p>
            <div class="field-group">
                <div class="field-row"><span class="field-row__label">Roulement décollage (m)</span>
                    <input type="number" id="cfg_todr" class="nc-input nc-input-sm" step="1"></div>
                <div class="field-row"><span class="field-row__label">Décollage 50 ft (m)</span>
                    <input type="number" id="cfg_tod" class="nc-input nc-input-sm" step="1"></div>
                <div class="field-row"><span class="field-row__label">Roulement atterrissage (m)</span>
                    <input type="number" id="cfg_ldr" class="nc-input nc-input-sm" step="1"></div>
                <div class="field-row"><span class="field-row__label">Atterrissage 50 ft (m)</span>
                    <input type="number" id="cfg_ld" class="nc-input nc-input-sm" step="1"></div>
            </div>
        </div>

        <div class="modal__footer">
            <button class="nc-btn nc-btn-tertiary" onclick="PerfAvion.closeModal()">Annuler</button>
            <button class="nc-btn nc-btn-primary" onclick="PerfAvion.saveAircraft()">Enregistrer</button>
        </div>
    </div>
</div>
