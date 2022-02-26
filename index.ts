import { BoundingBox, Location, Size } from "@andrewthehan/math";
import {
  CSSProperties,
  RefCallback,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export function useWindowSize(): Size {
  const [size, setSize] = useState(() => Size.of(0, 0));

  useLayoutEffect(() => {
    function handleChange() {
      setSize(Size.of(window.innerWidth, window.innerHeight));
    }

    handleChange();

    window.addEventListener("resize", handleChange);
    window.addEventListener("scroll", handleChange);

    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("scroll", handleChange);
    };
    // eslint-disable-next-line
  }, []);

  return size;
}

export function useRefCallback<T extends HTMLElement>(): [RefCallback<T>, T?] {
  const [node, setNode] = useState<T>();

  const ref = useCallback<RefCallback<T>>((node) => {
    if (node == null) {
      return;
    }

    setNode(node);
  }, []);

  return [ref, node];
}

export function useSize<T extends HTMLElement>(): [RefCallback<T>, Size] {
  const [size, setSize] = useState(() => Size.of(0, 0));

  const [ref, node] = useRefCallback<T>();

  const handleResize = useCallback<ResizeObserverCallback>(
    (elements: ResizeObserverEntry[]) => {
      if (elements.length !== 1) {
        throw new Error(
          `Expected to observe exactly 1 element but was observing ${elements.length} elements: ${elements}`
        );
      }

      const element = elements[0];
      const { width, height } = element.contentRect;
      const nextSize = Size.of(width, height);
      setSize((size) => (Size.equals(size, nextSize) ? size : nextSize));
    },
    []
  );

  useEffect(() => {
    if (node == null) {
      return;
    }

    const curNode = node;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(curNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [node, handleResize]);

  return [ref, size];
}

export function useLocation<T extends HTMLElement>(
  refreshDelayInMs: number = 100
): [RefCallback<T>, Location] {
  const [location, setLocation] = useState(() => Location.origin());

  const [ref, node] = useRefCallback<T>();

  useEffect(() => {
    if (node == null) {
      return;
    }

    const curNode = node;

    const id = setInterval(() => {
      const { x, y } = curNode.getBoundingClientRect();

      const nextLocation = Location.of(x, y);
      setLocation((location) =>
        Location.equals(location, nextLocation) ? location : nextLocation
      );
    }, refreshDelayInMs);

    return () => {
      clearInterval(id);
    };
  }, [node]);

  return [ref, location];
}

export function useBox<T extends HTMLElement>(): [RefCallback<T>, BoundingBox] {
  const [locationRef, location] = useLocation<T>();
  const [sizeRef, size] = useSize<T>();
  const box = useMemo(() => new BoundingBox(location, size), [location, size]);

  const ref = useCallback(
    (ref: T) => {
      locationRef(ref);
      sizeRef(ref);
    },
    [locationRef, sizeRef]
  );

  return [ref, box];
}

export function useOnKeyPress(
  keyCode: string,
  action: () => void,
  allowInput: boolean = true
) {
  useEffect(() => {
    if (!allowInput) {
      return;
    }

    function keyPressHandler(e: KeyboardEvent) {
      if (e.code === keyCode) {
        action();
      }
    }

    window.addEventListener("keydown", keyPressHandler);

    return () => {
      window.removeEventListener("keydown", keyPressHandler);
    };
  }, [keyCode, action, allowInput]);
}

export function useOnMouseWheel<T extends HTMLElement>(
  action: (scrollAmount: number) => void,
  allowInput: boolean = true
): RefCallback<T> {
  const [ref, node] = useRefCallback<T>();

  useEffect(() => {
    if (node == null || !allowInput) {
      return;
    }

    function mouseWheelHandler(e: WheelEvent) {
      action(e.deltaY);
    }

    const curNode = node;
    curNode.addEventListener("wheel", mouseWheelHandler);

    return () => {
      curNode.removeEventListener("wheel", mouseWheelHandler);
    };
  }, [node, action, allowInput]);

  return ref;
}

export function useZoom<T extends HTMLElement>(
  allowInput: boolean
): [RefCallback<T>, CSSProperties] {
  const [zoom, setZoom] = useState(1);

  const callback = useCallback(
    (amount) => setZoom((zoom) => zoom * (1 - amount / 125 / 10)),
    []
  );

  const ref = useOnMouseWheel(callback, allowInput);

  const style = useMemo(
    () => ({
      transform: `scale(${zoom})`,
      transformOrigin: "center",
    }),
    [zoom]
  );

  return [ref, style];
}

// adapted from https://usehooks.com/useHover/
export function useHover<T extends HTMLElement>(): [RefCallback<T>, boolean] {
  const [value, setValue] = useState(false);
  const mouseEnter = useCallback(() => setValue(true), []);
  const handleMouseLeave = useCallback(() => setValue(false), []);

  const [ref, node] = useRefCallback<T>();

  useEffect(() => {
    if (node == null) {
      return;
    }

    const curNode = node;

    curNode.addEventListener("mouseenter", mouseEnter);
    curNode.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      curNode.removeEventListener("mouseenter", mouseEnter);
      curNode.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [node, mouseEnter, handleMouseLeave]);

  return [ref, value];
}

export function useWarnOnClose() {
  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = true;
      return true;
    }

    window.addEventListener("beforeunload", warn, { capture: true });
    return () =>
      window.removeEventListener("beforeunload", warn, { capture: true });
  });
}
