import React, { Component } from 'react';
import { AsyncAPIDocumentInterface } from '@asyncapi/parser';

import { SpecificationHelpers, DiffHelper, scrollIntoViewById } from '../../helpers';
import { ErrorObject, PropsSchema } from '../../types';
import { ConfigInterface, defaultConfig } from '../../config';

import AsyncApiLayout from './Layout';
import { Error } from '../Error/Error';

export interface AsyncApiProps {
  schema: PropsSchema;
  config?: Partial<ConfigInterface>;
  error?: ErrorObject;
}

interface AsyncAPIState {
  asyncapi?: AsyncAPIDocumentInterface;
  previousAsyncapi?: AsyncAPIDocumentInterface;
  error?: ErrorObject;
}

class AsyncApiComponent extends Component<AsyncApiProps, AsyncAPIState> {
  state: AsyncAPIState = {
    asyncapi: undefined,
    previousAsyncapi: undefined,
    error: undefined,
  };

  constructor(props: AsyncApiProps) {
    super(props);

    const parsedSpec = SpecificationHelpers.retrieveParsedSpec(props.schema);
    if (parsedSpec) {
      this.state = {
        asyncapi: parsedSpec,
        previousAsyncapi: undefined,
      };
    }
  }

  componentDidMount() {
    if (!this.state.asyncapi) {
      this.updateState(this.props.schema);
    }
  }

  componentDidUpdate(prevProps: AsyncApiProps) {
    const oldSchema = prevProps.schema;
    const newSchema = this.props.schema;

    if (oldSchema !== newSchema) {
      // Store previous asyncapi before updating
      const previousAsyncapi = this.state.asyncapi;
      this.updateState(newSchema, previousAsyncapi);
    }
  }

  render() {
    const { config, error: propError } = this.props;
    const { asyncapi, error: stateError } = this.state;

    const error = propError ?? stateError;
    const concatenatedConfig: ConfigInterface = {
      ...defaultConfig,
      ...config,
      show: {
        ...defaultConfig.show,
        ...(!!config && config.show),
      },
      expand: {
        ...defaultConfig.expand,
        ...(!!config && config.expand),
      },
      sidebar: {
        ...defaultConfig.sidebar,
        ...(!!config && config.sidebar),
      },
      extensions: {
        ...defaultConfig.extensions,
        ...(!!config && config.extensions),
      },
    };

    if (!asyncapi) {
      if (!error) {
        return null;
      }
      return (
        concatenatedConfig.show?.errors && (
          <section className="aui-root">
            <Error error={error} />
          </section>
        )
      );
    }

    return (
      <AsyncApiLayout
        asyncapi={asyncapi}
        config={concatenatedConfig}
      />
    );
  }

  private updateState(
    schema: PropsSchema,
    previousAsyncapi?: AsyncAPIDocumentInterface,
  ) {
    const parsedSpec = SpecificationHelpers.retrieveParsedSpec(schema);
    if (!parsedSpec) {
      this.setState({
        asyncapi: undefined,
        previousAsyncapi: undefined,
      });
      return;
    }

    // If we have a previous document, compute and log the changes
    if (previousAsyncapi) {
      const changes = DiffHelper.calculateDiff(previousAsyncapi, parsedSpec);
      // Log changes between consecutive documents
      // eslint-disable-next-line no-console
      console.log('AsyncAPI document changes (previous -> current):', changes);
      if (changes.length > 0) {
        console.log("scrolling into view: ",changes[0].sectionId)
        scrollIntoViewById(changes[0].sectionId)
      }
    }
    
    // On initial load, set previousAsyncapi to current to avoid false positives on next change
    const updatedPreviousAsyncapi = previousAsyncapi ?? parsedSpec;

    this.setState({
      asyncapi: parsedSpec,
      previousAsyncapi: updatedPreviousAsyncapi,
    });
  }
}

export default AsyncApiComponent;
