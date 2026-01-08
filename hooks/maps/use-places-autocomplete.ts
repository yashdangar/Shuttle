"use client";

import { RefObject, useEffect, useRef } from "react";

import { useGoogleMapsLoader } from "./use-google-maps-loader";

type UsePlacesAutocompleteOptions = {
  inputRef: RefObject<HTMLInputElement | null>;
  onPlaceChanged?: (place: google.maps.places.PlaceResult | null) => void;
  options?: google.maps.places.AutocompleteOptions;
};

export function usePlacesAutocomplete({
  inputRef,
  onPlaceChanged,
  options,
}: UsePlacesAutocompleteOptions) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceChangedRef = useRef(onPlaceChanged);
  const { maps, ...loader } = useGoogleMapsLoader({ libraries: ["places"] });

  // Keep callback ref up to date
  useEffect(() => {
    onPlaceChangedRef.current = onPlaceChanged;
  }, [onPlaceChanged]);

  useEffect(() => {
    if (
      !loader.isLoaded ||
      !maps ||
      autocompleteRef.current ||
      !inputRef.current
    )
      return;

    const autocomplete = new maps.places.Autocomplete(
      inputRef.current,
      options
    );
    autocompleteRef.current = autocomplete;

    const handlePlaceChanged = () => {
      const place = autocomplete.getPlace();
      // Only trigger if place has geometry (valid location)
      if (place && place.geometry && place.geometry.location) {
        onPlaceChangedRef.current?.(place);
      }
    };

    // Listen for place_changed event (fires when user selects from dropdown or presses Enter)
    const listener = autocomplete.addListener(
      "place_changed",
      handlePlaceChanged
    );

    return () => {
      listener.remove();
      autocompleteRef.current = null;
    };
  }, [inputRef, loader.isLoaded, maps, options]);

  return {
    autocomplete: autocompleteRef.current,
    ...loader,
  };
}
