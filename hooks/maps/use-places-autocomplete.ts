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
  const { maps, ...loader } = useGoogleMapsLoader({ libraries: ["places"] });

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

    const listener = autocomplete.addListener("place_changed", () => {
      onPlaceChanged?.(autocomplete.getPlace() ?? null);
    });

    return () => {
      listener.remove();
    };
  }, [inputRef, loader.isLoaded, maps, onPlaceChanged, options]);

  return {
    autocomplete: autocompleteRef.current,
    ...loader,
  };
}
