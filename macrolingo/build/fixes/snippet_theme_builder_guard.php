<?php
/**
 * MacroLingo: keep header and footer assigned
 * ---------------------------------------------------------------------------
 * Twice on 14 Sep 2026 the whole site lost its Elementor header and footer
 * right after a template was saved (Adam publishing the footer; a page saved
 * as a template). The templates were intact and each still said "Entire
 * site" - only Elementor Pro's cached copy of the display rules had dropped
 * them, so every page fell back to the theme's old header and footer.
 *
 * This keeps that cache honest, with no one having to notice:
 *
 *   1. whenever Elementor writes the cache, it is compared with the display
 *      conditions stored on the published templates themselves, and any
 *      template missing from it is put back;
 *   2. on any request, if the cache has no header or no footer while a
 *      published template says it should, the same repair runs.
 *
 * It only restores what the templates' own Display Conditions say. If a
 * template's conditions are removed on purpose, it is not put back. Switch
 * this snippet off and Elementor behaves exactly as before.
 */

const ML_TB_OPTION = 'elementor_pro_theme_builder_conditions';

/** Template type -> theme builder location, as Elementor Pro files them. */
function ml_tb_location_for( $type ) {
    $map = array(
        'header'         => 'header',
        'footer'         => 'footer',
        'single'         => 'single',
        'single-post'    => 'single',
        'single-page'    => 'single',
        'error-404'      => 'single',
        'archive'        => 'archive',
        'search-results' => 'archive',
    );
    return isset( $map[ $type ] ) ? $map[ $type ] : null;
}

/** What the cache should hold, read straight from the templates. */
function ml_tb_expected() {
    $ids = get_posts( array(
        'post_type'        => 'elementor_library',
        'post_status'      => 'publish',
        'numberposts'      => -1,
        'fields'           => 'ids',
        'meta_key'         => '_elementor_conditions',
        'suppress_filters' => true, // no language filtering from WPML
    ) );
    $expected = array();
    foreach ( $ids as $id ) {
        $location = ml_tb_location_for( get_post_meta( $id, '_elementor_template_type', true ) );
        $conditions = get_post_meta( $id, '_elementor_conditions', true );
        if ( ! $location || empty( $conditions ) || ! is_array( $conditions ) ) {
            continue;
        }
        $list = array();
        foreach ( $conditions as $c ) {
            if ( is_array( $c ) ) {
                unset( $c['_id'] );
                $c = rtrim( implode( '/', array_values( $c ) ), '/' );
            }
            if ( is_string( $c ) && $c !== '' ) {
                $list[] = $c;
            }
        }
        if ( $list ) {
            $expected[ $location ][ $id ] = $list;
        }
    }
    return $expected;
}

/** Put back any template the cache has lost. Returns true if it changed. */
function ml_tb_repair( $value = null ) {
    static $busy = false;
    if ( $busy ) {
        return false;
    }
    if ( $value === null ) {
        $value = get_option( ML_TB_OPTION );
    }
    $value = is_array( $value ) ? $value : array();
    $fixed = $value;
    $changed = false;
    foreach ( ml_tb_expected() as $location => $items ) {
        foreach ( $items as $id => $conditions ) {
            if ( empty( $fixed[ $location ][ $id ] ) ) {
                $fixed[ $location ][ $id ] = $conditions;
                $changed = true;
            }
        }
    }
    if ( $changed ) {
        $busy = true;
        update_option( ML_TB_OPTION, $fixed );
        $busy = false;
    }
    return $changed;
}

// 1. right after Elementor writes the cache
add_action( 'update_option_' . ML_TB_OPTION, function ( $old, $value ) {
    ml_tb_repair( $value );
}, 99, 2 );
add_action( 'add_option_' . ML_TB_OPTION, function ( $name, $value ) {
    ml_tb_repair( $value );
}, 99, 2 );

// 2. on any request, a cheap check: only when header or footer is missing
add_action( 'init', function () {
    $cache = get_option( ML_TB_OPTION );
    if ( ! is_array( $cache ) || empty( $cache['header'] ) || empty( $cache['footer'] ) ) {
        ml_tb_repair( is_array( $cache ) ? $cache : array() );
    }
}, 5 );
